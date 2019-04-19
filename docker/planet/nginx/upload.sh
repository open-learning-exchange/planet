#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

if [ "$REQUEST_METHOD" = "POST" ]; then

  IFS=$'\r'
  read -r delim_line

  IFS=''
  delim_line="${delim_line}--"$'\r'

  read -r line
  filename=$(echo $line | sed 's/^.*filename=//' | sed 's/\"//g' | sed 's/.$//')
  #fileext=${filename##*.}

  #$time=$(date + "%T")
  TMPOUT=/usr/share/nginx/html/fs/$filename
  cat > $TMPOUT.tmp

  # Get the line count
  LINES=$(wc -l $TMPOUT.tmp | cut -d ' ' -f 1)

  # Remove the first four lines
  tail -$((LINES - 2)) $TMPOUT.tmp >$TMPOUT

  rm $TMPOUT.tmp
fi 