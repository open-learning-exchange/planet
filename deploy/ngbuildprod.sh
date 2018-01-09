#!/bin/bash

bell() {
    while true; do
        echo -e "\a"
        sleep 60
    done
}

bell &
BUILD_CODE=$(ng build --prod)
kill %1
exit $BUILD_CODE
