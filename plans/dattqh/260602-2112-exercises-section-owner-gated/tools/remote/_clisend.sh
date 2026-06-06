read PW
logger -p user.notice "LAB-SYSLOG-OK $(hostname) $(date +%H:%M:%S)"
logger -p auth.warning "LAB-SYSLOG-OK auth-demo"
