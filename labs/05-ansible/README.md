# Lab 05 — Ansible

## Cấu trúc
```
05-ansible/
├── ansible.cfg
├── inventory.yml
├── group_vars/
│   └── webservers.yml
├── playbook-nginx.yml
└── roles/
    └── nginx/
        ├── tasks/main.yml
        ├── handlers/main.yml
        ├── templates/nginx-site.conf.j2
        └── defaults/main.yml
```

## Chạy
```bash
# Cài ansible
sudo apt install ansible

# Test connectivity
ansible -i inventory.yml all -m ping

# Dry run
ansible-playbook -i inventory.yml playbook-nginx.yml --check --diff

# Apply
ansible-playbook -i inventory.yml playbook-nginx.yml
```

## Idempotent test
Chạy playbook lần 2 — tất cả task phải là `ok`, không `changed`.
