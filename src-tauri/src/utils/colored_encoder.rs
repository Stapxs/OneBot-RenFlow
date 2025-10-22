use log::{Level, Record};
use log4rs::encode::{Encode, Write};

#[derive(Debug)]
pub struct ColoredPrefixEncoder;

impl Encode for ColoredPrefixEncoder {
    fn encode(&self, w: &mut dyn Write, record: &Record<'_>) -> anyhow::Result<()> {
        let level = record.level();
        let color_code = match level {
            Level::Error => "\x1B[31m",       // 红
            Level::Warn => "\x1B[33m",        // 黄
            Level::Info => "\x1B[38;5;35m",   // 自定义绿（可以替换）
            Level::Debug => "\x1B[90m",       // 深灰
            Level::Trace => "\x1B[90m",       // 同 debug
        };

        let time = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%.3f");
        let module_path = record.module_path().unwrap_or("unknown");

        write!(
            w,
            "{}[{}] [{}] {} -\x1B[0m {}{}\n",
            color_code,
            time,
            level,
            module_path,
            record.args(),
            "\x1B[0m"
        )?;

        Ok(())
    }
}
