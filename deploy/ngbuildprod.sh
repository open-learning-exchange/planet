#!/bin/bash

bell() {
    while true; do
        echo -e "\a"
        sleep 60
    done
}

bell &
ng build --prod
BUILD_CODE=$?
kill %1
exit $BUILD_CODE
