# ARP lab host image — two instances launched by docker-compose.yml share
# lab-arp-net with static MACs + IPs so `ip neigh`, `ping`, `arping` hit
# deterministic peers.
FROM alpine:3.19

RUN apk add --no-cache \
    iproute2 \
    iputils \
    iputils-arping \
    tcpdump \
    bash \
    tmux

COPY docker/tmux.conf /etc/tmux.conf
COPY docker/lab-arp/motd.txt /etc/motd

RUN adduser -D -s /bin/bash labuser && \
    echo 'cat /etc/motd' >> /home/labuser/.bashrc
USER labuser
WORKDIR /home/labuser

CMD ["sleep", "infinity"]
