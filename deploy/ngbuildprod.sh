#!/bin/bash

bell() {
    while true; do
        echo -e "\a"
        sleep 60
    done
}

bell &
ng build --prod
kill %1

