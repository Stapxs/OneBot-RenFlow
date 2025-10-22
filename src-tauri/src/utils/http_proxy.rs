use std::collections::HashMap;
use std::convert::Infallible;
use std::net::SocketAddr;

use reqwest::Client;
use warp::reply::Reply;
use warp::Filter;

const START_PORT: u16 = 5001;
const MAX_PORT: u16 = 5100;

pub struct ProxyServer {
    pub port: u16
}

impl ProxyServer {
    pub async fn new() -> Self {
        let client = Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap();
        let ptoxy_client = client.clone();
        let assets_client = client.clone();

        let proxy_filter = warp::path("proxy")
            .and(warp::query::<HashMap<String, String>>())
            .and_then({
                let client = ptoxy_client;
                move |params: HashMap<String, String>| {
                    let client = client.clone();
                    async move {
                        if let Some(target_url) = params.get("url") {
                            match client.get(target_url).send().await {
                                Ok(response) => {
                                    let mut res = warp::http::Response::builder()
                                        .status(warp::http::StatusCode::from_u16(response.status().as_u16()).unwrap());

                                    let body = response.bytes().await.unwrap_or_default();

                                    res = res
                                        .header("Access-Control-Allow-Origin", "*")
                                        .header("X-Frame-Options", "")
                                        .header("Content-Type", "text/html; charset=utf-8");

                                    Ok::<_, Infallible>(res.body(body).into_response())
                                }
                                Err(_) => Ok::<_, Infallible>(
                                    warp::reply::with_status("请求失败", warp::http::StatusCode::BAD_GATEWAY)
                                        .into_response(),
                                ),
                            }
                        } else {
                            Ok::<_, Infallible>(
                                warp::reply::with_status("未知的 URL", warp::http::StatusCode::BAD_REQUEST)
                                    .into_response(),
                            )
                        }
                    }
                }});

        let assets_filter = warp::path("assets")
            .and(warp::query::<HashMap<String, String>>())
            .and_then({
                let client = assets_client;
                move |params: HashMap<String, String>| {
                    let client = client.clone();
                    async move {
                        if let Some(target_url) = params.get("url") {
                            match client.get(target_url).send().await {
                                Ok(response) => {
                                    let content_type = response
                                        .headers()
                                        .get("Content-Type")
                                        .and_then(|v| v.to_str().ok())
                                        .unwrap_or("application/octet-stream")
                                        .to_string();

                                        let res = warp::http::Response::builder()
                                        .status(warp::http::StatusCode::from_u16(response.status().as_u16()).unwrap());

                                    let body = response.bytes().await.unwrap_or_default();

                                    let res = res
                                        .header("Content-Type", content_type)
                                        .header("Access-Control-Allow-Origin", "*");

                                    Ok::<_, Infallible>(res.body(body).into_response())
                                }
                                Err(_) => Ok::<_, Infallible>(
                                    warp::reply::with_status("请求失败", warp::http::StatusCode::BAD_GATEWAY)
                                        .into_response(),
                                ),
                            }
                        } else {
                            Ok::<_, Infallible>(
                                warp::reply::with_status(
                                    "缺少参数: url",
                                    warp::http::StatusCode::BAD_REQUEST,
                                )
                                .into_response(),
                            )
                        }
                    }
                }
            });

        let mut port = START_PORT;
        let routes = proxy_filter.or(assets_filter);

        loop {
            let addr: SocketAddr = ([127, 0, 0, 1], port).into();

            match warp::serve(routes.clone()).try_bind_ephemeral(addr) {
                Ok((_, server)) => {
                    tokio::spawn(server);
                    return Self { port };
                }
                Err(_) => {
                    port += 1;
                    if port > MAX_PORT {
                        panic!("❌ 本地反代服务无法绑定 {}-{}", START_PORT, MAX_PORT);
                    }
                }
            }
        }
    }
}
