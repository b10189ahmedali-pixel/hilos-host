#!/bin/bash

REPO="https://github.com/b10189ahmedali-pixel/hilos-host.git"
FOLDER="hilos-host"
APP_NAME="hiloshost"

# ---------- Colors ----------
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ---------- Watermark ----------
watermark() {
    echo -e "${MAGENTA}"
    echo "===================================="
    echo "        H I L O S  P A N E L     "
    echo "===================================="
    echo -e "${NC}"
}

# ---------- Detect Port ----------
detect_port() {
    if [ "$CODESANDBOX_SHELL" = "true" ]; then
        echo "5000"
        return
    fi

    if grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        echo "5173"
    elif grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        echo "3000"
    else
        echo "8080"
    fi
}

# ---------- Install ----------
install_requirements() {
    sudo apt update -y
    sudo apt install -y git curl ufw build-essential

    if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    sudo npm install -g pm2
}

# ---------- Clone ----------
clone_repo() {
    if [ -d "$FOLDER" ]; then
        cd "$FOLDER" || exit
        git pull
    else
        git clone "$REPO"
        cd "$FOLDER" || exit
    fi
}

# ---------- AUTO ADMIN (FIRST BOOT SAFE) ----------
auto_admin() {
    if [ ! -f "$FOLDER/admin.json" ]; then
        echo -e "${CYAN}First boot detected - creating admin...${NC}"

        mkdir -p "$FOLDER"

cat > "$FOLDER/admin.json" <<EOF
{
  "username": "admin",
  "password": "admin123",
  "email": "admin@nethost.local",
  "first_name": "Net",
  "last_name": "Host"
}
EOF

        echo -e "${GREEN}Default admin created (admin/admin123)${NC}"
    fi
}

# ---------- NODE FIX ----------
auto_nodes() {
    if [ ! -f "$FOLDER/nodes.json" ]; then
cat > "$FOLDER/nodes.json" <<EOF
{
  "token": "default-token",
  "token_id": "default-id",
  "panel_link": "http://localhost",
  "panel_id": "main"
}
EOF
    fi
}

# ---------- START APP ----------
start_app() {
    PORT=$(detect_port)

    echo -e "${YELLOW}Starting on port $PORT${NC}"

    pm2 delete "$APP_NAME" >/dev/null 2>&1

    PORT=$PORT pm2 start npm --name "$APP_NAME" -- start

    pm2 startup
    pm2 save
}

# ---------- INSTALL ----------
install_app() {
    clear
    watermark

    install_requirements
    clone_repo

    npm install

    auto_admin
    auto_nodes

    start_app

    echo -e "${GREEN}Panel running successfully${NC}"
}

# ---------- ADMIN ----------
admin_setup() {
    clear
    cd "$FOLDER" || return

    echo "ADMIN CONFIG"

    read -p "Username: " USERNAME
    read -p "Password: " PASSWORD
    read -p "Email: " EMAIL
    read -p "First Name: " FIRST
    read -p "Last Name: " LAST

cat > admin.json <<EOF
{
  "username": "$USERNAME",
  "password": "$PASSWORD",
  "email": "$EMAIL",
  "first_name": "$FIRST",
  "last_name": "$LAST"
}
EOF

    echo "Admin updated"
}

# ---------- NODE ----------
node_setup() {
    clear
    cd "$FOLDER" || return

    read -p "Token: " TOKEN
    read -p "Token ID: " TOKEN_ID
    read -p "Panel Link: " LINK
    read -p "Panel ID: " ID

cat > nodes.json <<EOF
{
  "token": "$TOKEN",
  "token_id": "$TOKEN_ID",
  "panel_link": "$LINK",
  "panel_id": "$ID"
}
EOF

    echo "Nodes updated"
}

# ---------- SSL (OPTIONAL) ----------
ssl_setup() {
    echo "Install nginx + certbot"
    sudo apt install nginx certbot python3-certbot-nginx -y

    read -p "Domain: " DOMAIN

    sudo certbot --nginx -d "$DOMAIN"
}

# ---------- MENU ----------
while true
do
clear
watermark

echo "1) Install Full Panel"
echo "2) Admin Setup"
echo "3) Node Setup"
echo "4) Restart"
echo "5) Logs"
echo "6) SSL Setup"
echo "7) Exit"
echo "----------------------------------"

read -p "Select: " c

case $c in
1) install_app ;;
2) admin_setup ;;
3) node_setup ;;
4) pm2 restart "$APP_NAME" ;;
5) pm2 logs "$APP_NAME" ;;
6) ssl_setup ;;
7) exit ;;
esac

read -p "Enter..."
done
