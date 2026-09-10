#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

# Bytes available, so callers can compare against an image size instead of
# parsing a human-readable string like "2.3G". df -P reports 1024-byte blocks.
df -P / | awk 'END {print $4 * 1024}'
