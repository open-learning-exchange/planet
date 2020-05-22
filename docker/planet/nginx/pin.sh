#!/bin/sh

echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

HASH_PATH=hash.txt
sha256sum "$PLANET_PIN" >> $HASH_PATH