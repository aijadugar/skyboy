//! Reading the payload, without ever reading more than we agreed to.

use std::io::Read;

/// Read stdin, but refuse to buffer more than `limit` bytes.
///
/// A hook payload is a few kilobytes. Reading to end-of-file without a cap
/// would let a broken or hostile agent decide how much memory this process
/// allocates, and this process runs inside that agent's critical path.
///
/// Reads up to `limit + 1` bytes so that "exactly the limit" passes and
/// "one byte over" is reported as too large rather than silently truncated.
pub fn read_stdin_limited(limit: usize) -> Result<Vec<u8>, String> {
    read_limited(std::io::stdin().lock(), limit)
}

/// The testable half of [`read_stdin_limited`].
pub fn read_limited<R: Read>(reader: R, limit: usize) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    // `take` stops the read itself, so an endless stream cannot spin here.
    let read = reader
        .take(limit as u64 + 1)
        .read_to_end(&mut buffer)
        .map_err(|error| error.to_string())?;
    if read > limit {
        return Err(format!("payload is larger than the {limit} byte limit"));
    }
    Ok(buffer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_payload_that_is_under_the_limit() {
        let payload = br#"{"hook_event_name":"Stop"}"#;
        assert_eq!(
            read_limited(&payload[..], 1024).expect("read"),
            payload.to_vec()
        );
    }

    #[test]
    fn accepts_a_payload_of_exactly_the_limit() {
        let payload = [b'a'; 64];
        assert_eq!(read_limited(&payload[..], 64).expect("read").len(), 64);
    }

    #[test]
    fn refuses_a_payload_one_byte_over_the_limit() {
        let payload = [b'a'; 65];
        assert!(read_limited(&payload[..], 64).is_err());
    }

    #[test]
    fn an_empty_stdin_is_not_an_error_here() {
        // Whether an empty payload is meaningful is the parser's business; the
        // reader's job is only to not blow up.
        assert_eq!(read_limited(&b""[..], 64).expect("read"), Vec::<u8>::new());
    }
}
