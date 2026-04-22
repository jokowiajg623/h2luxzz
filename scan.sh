#!/bin/bash
while true; do
    rm -f telnet.txt

    sudo zmap -i eth0 -p 23 -r 5000 -w range.txt -o - -v 3 --gateway-mac=$(ip neigh show | grep "$(ip route show | grep default | awk '{print $3}')" | awk '{print $5}') 2> telnet.txt | python3.11 telnet.py &

    echo "Start"

    while true; do
        cond1=$(grep -q "\[INFO\] zmap: completed" telnet.txt 2>/dev/null && echo 1 || echo 0)

        if ! pgrep -f zmap > /dev/null; then
            cond2="1"
        else
            cond2="0"
        fi

        if [[ "$cond1" == "1" && "$cond2" == "1" ]]; then
            pkill -f zmap
            pkill -f telnet.py
            echo "End"
            break
        fi

        if ! pgrep -f zmap > /dev/null; then
            break
        fi

        sleep 60
    done
done
