#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

echo $(df -h / | tail -1 | awk '{print $4}')
