use std::{collections::HashMap, io::{self, Write}, fs::File, process::Command, sync::Arc, time::Duration};
use crate::{PROXY_PORT};

use log::{debug, error, info};
use reqwest::Client;
use rfd::MessageLevel;
use serde_json::Value;
use tauri::{command, AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;
use futures_util::StreamExt;
use user_notify::NotificationManager;

#[command]
pub async fn sys_front_loaded(
    app: AppHandle,
    notifications: State<'_, Arc<dyn NotificationManager>>) -> Result<String, String> {
    match notifications.first_time_ask_for_notification_permission().await {
        Err(err) => {
            log::error!("请求通知权限失败: {}", err);
        }
        Ok(false) => {
            log::info!("通知权限被拒绝");
        }
        Ok(true) => {
            log::info!("通知权限已授予");
        }
    }
    return Ok("".to_string());
}

#[command]
pub fn sys_get_platform() -> String {
    // win32、darwin、linux，其他情况全算做 linux
    if cfg!(windows) {
        return "win32".to_string();
    } else if cfg!(target_os = "macos") {
        return "darwin".to_string();
    } else {
        return "linux".to_string();
    }
}

use serde::Serialize;

#[derive(Serialize)]
pub struct SystemInfo {
    release: String,
    arch: String,
}

#[command]
pub fn sys_get_release() -> Option<SystemInfo> {
    let arch = std::env::consts::ARCH.to_string();
    #[cfg(target_os = "windows")] {
        use winver::WindowsVersion;
        let version = WindowsVersion::detect().unwrap();
        Some(SystemInfo {
            release: format!("{} {}.{}.{}", "Windows", version.major, version.minor, version.build),
            arch,
        })
    }
    #[cfg(target_os = "macos")] {
        let output = Command::new("sw_vers")
            .arg("-productVersion")
            .output().ok()?;
        if !output.status.success() {
            return Some(SystemInfo { release: "".to_string(), arch });
        }
        let version_string = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Some(SystemInfo {
            release: format!("macOS {}", version_string),
            arch,
        })
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))] {
        Some(SystemInfo { release: "".to_string(), arch })
    }
}

#[command]
pub async fn sys_get_final_redirect_url(data: String) -> Result<String, String> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 100 {
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let res = client
        .get(&data)
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    let final_url = res.url().to_string();
    Ok(final_url)
}

#[command]
pub async fn sys_get_html(data: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client.get(&data).send().await.map_err(|e| e.to_string())?;

    let content_type = res
        .headers()
        .get("Content-Type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if content_type.contains("text/html") {
        res.text().await.map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[command]
pub async fn sys_get_api(data: String) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let res = client.get(&data).send().await.map_err(|e| e.to_string())?;

    let content_type = res
        .headers()
        .get("Content-Type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if content_type.contains("application/json") {
        res.json::<Value>().await.map_err(|e| e.to_string())
    } else {
        Err("Response is not JSON".to_string())
    }
}

#[command]
pub async fn sys_download(app_handle: AppHandle, downloadPath: String, fileName: String) -> Result<(), String> {
    info!("下载文件：{:?}", downloadPath);

    let folder = rfd::FileDialog::new()
        .pick_folder();

    let folder_path = match folder {
        Some(folder) => folder,
        None => {
            info!("用户取消了选择文件夹");
            app_handle.emit("sys:downloadCancel", "").unwrap();
            return Ok(());
        }
    };

    let filepath = folder_path.join(fileName);
    debug!("下载文件路径: {:?}", filepath);
    // 检查文件是否存在
    if filepath.exists() {
        let result = rfd::MessageDialog::new()
            .set_title("文件已存在")
            .set_description("文件已存在，是否覆盖？")
            .set_level(MessageLevel::Warning)
            .set_buttons(rfd::MessageButtons::YesNo)
            .show();
        if result != rfd::MessageDialogResult::Yes {
            info!("用户取消了下载");
            app_handle.emit("sys:downloadCancel", "").unwrap();
            return Ok(());
        }
    }

    let result = async {
        let client = Client::new();
        let response = client.get(downloadPath).send().await.map_err(|e| format!("请求失败: {}", e))?;

        let total_size = response
            .content_length()
            .ok_or_else(|| {
                io::Error::new(io::ErrorKind::Other, "无法获取文件大小")
            })?;

        let mut file = File::create(&filepath)?;
        let mut stream = response.bytes_stream();

        let mut downloaded: u64 = 0;
        while let Some(item) = stream.next().await {
            let chunk = item?;
            file.write_all(&chunk)?;
            downloaded += chunk.len() as u64;

            let percent = downloaded as f64 / total_size as f64 * 100.0;
            print!("\r已下载: {:.2}%", percent);
            let mut payload: HashMap<&str, Value> = HashMap::new();
            payload.insert("lengthComputable", true.into());
            payload.insert("loaded", downloaded.into());
            payload.insert("total", total_size.into());
            app_handle.emit("sys:downloadBack", payload).unwrap();
            io::stdout().flush()?;
        }

        Ok::<_, Box<dyn std::error::Error>>(())
    }.await;
    if let Err(e) = result {
        error!("下载失败: {}", e);
        app_handle.emit("sys:downloadError", e.to_string()).unwrap();
        return Err(e.to_string());
    }

    println!("\r");
    info!("下载完成: {:?}", filepath);

    return Ok(())
}

#[command]
pub async fn sys_send_notice(
    app: AppHandle,
    manager: State<'_, Arc<dyn NotificationManager>>,
    data: HashMap<String, Value>
) -> Result<(), String> {
    debug!("发送通知: {:?}", data.get("body"));
    let mut notification = user_notify::NotificationBuilder::new();
    let base_type = data.get("base_type").unwrap().as_str().unwrap();

    if base_type == "msg" {
        notification = notification
            .title(data.get("title").unwrap().as_str().unwrap())
            .body(data.get("body").unwrap().as_str().unwrap())
            .set_thread_id(data.get("tag").unwrap().as_str().unwrap())
            .set_xdg_category(user_notify::XdgNotificationCategory::ImReceived)
            .set_category_id("cn.stapxs.qqweb.reply");
        // 设置 payload
        let mut user_info = HashMap::new();
        user_info.insert(
            "NotificationPayload".to_owned(),
            data.get("tag").unwrap().as_str().unwrap().to_owned() +
                "/" + data.get("type").unwrap().as_str().unwrap()
        );
        notification = notification.set_user_info(user_info);
        // 获取图片，优先 image，没有为 icon；都是 url
        let image = data.get("image").and_then(|v| v.as_str()).unwrap_or("");
        // 头像在通知里显示得都太占地方了，干脆不显示了
        // let icon = data.get("icon").and_then(|v| v.as_str()).unwrap_or("");
        let final_image = if !image.is_empty() {
            image
        } else {
            ""
        };
        if !final_image.is_empty() {
            if final_image.starts_with("http://") || final_image.starts_with("https://") {
                // 下载图片缓存
                let client = Client::new();
                let response = client.get(final_image).send().await.map_err(|e| format!("请求失败: {}", e))?;
                if response.status().is_success() {
                    let bytes = response.bytes().await.map_err(|e| format!("读取响应失败: {}", e))?;
                    let temp_file_path = app.path().app_cache_dir().unwrap().join("notification_image.png");
                    let mut file = File::create(&temp_file_path).map_err(|e| format!("创建临时文件失败: {}", e))?;
                    file.write_all(&bytes).map_err(|e| format!("写入临时文件失败: {}", e))?;
                    info!("下载图片成功: {:?}", temp_file_path);
                    notification = notification.set_image(temp_file_path);
                } else {
                    return Err(format!("下载图片失败: {}", response.status()));
                }
            }
        }
    } else {
        notification = notification
            .title(data.get("title").unwrap().as_str().unwrap())
            .body(data.get("body").unwrap().as_str().unwrap())
            .set_thread_id(data.get("tag").unwrap().as_str().unwrap())
            .set_xdg_category(user_notify::XdgNotificationCategory::ImReceived);
    }

    manager.send_notification(notification).await.map_err(|e| {
        error!("发送通知失败: {:?}", e);
        e.to_string()
    })?;

    Ok(())
}

#[command]
pub async fn sys_close_notice(
    manager: State<'_, Arc<dyn NotificationManager>>,
    data: String
) -> Result<String, String> {
    debug!("关闭通知: {}", data);
    let notifications = manager.get_active_notifications().await.map_err(|e| {
        error!("获取通知列表失败: {:?}", e);
        e.to_string()
    })?;
    let notifications_to_clear: Vec<_> = notifications
        .iter()
        .filter(|notification| {
            let user_info = notification.get_user_info();
            if let Some(payload) = user_info.get("NotificationPayload") {
                let payload_str = payload.to_string();
                return payload_str.starts_with(&data);
            }
            false
        })
        .map(|notification| notification.get_id().to_string())
        .collect();

    manager.remove_delivered_notifications(
        notifications_to_clear
            .iter()
            .map(|id| id.as_str())
            .collect(),
    ).map_err(|e| e.to_string())?;

    return Ok("success".to_string());
}

#[command]
pub fn sys_clear_notice(manager: State<'_, Arc<dyn NotificationManager>>) -> String {
    debug!("关闭所有通知");
    if let Err(err) = manager.remove_all_delivered_notifications() {
        error!("清除所有通知失败: {}", err);
        return err.to_string();
    } else {
        return "success".to_string();
    }
}

#[command]
pub async fn sys_close_all_notice(
    manager: State<'_, Arc<dyn NotificationManager>>,
    data: String
) -> Result<String, String> {
    debug!("关闭 {} 的所有通知", data);
    let notifications = manager.get_active_notifications().await.map_err(|e| {
        error!("获取通知列表失败: {:?}", e);
        e.to_string()
    })?;
    let notifications_to_clear: Vec<_> = notifications
        .iter()
        .filter(|notification| {
            let user_info = notification.get_user_info();
            if let Some(payload) = user_info.get("NotificationPayload") {
                let payload_str = payload.to_string();
                return payload_str.starts_with(&data);
            }
            false
        })
        .map(|notification| notification.get_id().to_string())
        .collect();

    manager.remove_delivered_notifications(
        notifications_to_clear
            .iter()
            .map(|id| id.as_str())
            .collect(),
    ).map_err(|e| e.to_string())?;

    return Ok("success".to_string());
}

#[command]
pub fn sys_run_command(data: String) -> HashMap<String, Value> {
    let mut ret: HashMap<String, Value> = HashMap::new();

    match Command::new(data).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            ret.insert("success".to_string(), true.into());
            ret.insert("message".to_string(), stdout.into());
        },
        Err(e) => {
            ret.insert("success".to_string(), false.into());
            ret.insert("message".to_string(), e.to_string().into());
        }
    }

    return ret;
}

#[command]
pub fn sys_open_in_browser(app_handle: tauri::AppHandle, data: String) {
    let _ = app_handle.opener().open_path(data, None::<&str>);
}

#[command]
pub fn sys_run_proxy() -> u16 {
    return PROXY_PORT.get().unwrap().clone();
}

// 设置 Store 值
#[command]
pub async fn sys_set_store_value(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store(".settings.dat")
        .map_err(|e| format!("Failed to get store: {}", e))?;

    store.set(key, serde_json::Value::String(value));
    store.save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// 获取 Store 值
#[command]
pub async fn sys_get_store_value(
    app: AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store(".settings.dat")
        .map_err(|e| format!("Failed to get store: {}", e))?;

    let value = store.get(&key);

    match value {
        Some(v) => {
            if let Some(s) = v.as_str() {
                Ok(Some(s.to_string()))
            } else {
                Ok(Some(v.to_string()))
            }
        }
        None => Ok(None),
    }
}

