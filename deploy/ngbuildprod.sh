#!/bin/bash

bell() {
    while true; do
        echo -e "\a"
        sleep 60
    done
}

bell &
ng build --prod #--aot
kill %1

