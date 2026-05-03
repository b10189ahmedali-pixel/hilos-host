#!/bin/bash

REPO="https://github.com/b10189ahmedali-pixel/hilos-host.git"
FOLDER="hilos-host"
APP_NAME="hiloshost"

clear

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------- Detect Port ----------
detect_port() {
    if grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        echo "5173"
    elif grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        echo "3000"
    else
        echo "8080"
    fi
}

# ---------- Install Dependencies ----------
install_requirements() {
    echo -e "${CYAN}Installing dependencies...${NC}"

    sudo apt update -y
    sudo apt install -y git curl unzip build-essential ufw

    if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    sudo npm install -g pm2
}

# ---------- Clone Repo ----------
clone_repo() {
    if [ -d "$FOLDER" ]; then
        cd "$FOLDER" || exit
        git reset --hard
        git pull
    else
        git clone "$REPO"
        cd "$FOLDER" || exit
    fi
}

# ---------- Install App ----------
install_app() {
    clear
    install_requirements
    clone_repo

    npm install

    PORT=$(detect_port)
    echo -e "${GREEN}Detected Port: $PORT${NC}"

    sudo ufw allow $PORT/tcp >/dev/null 2>&1

    pm2 delete "$APP_NAME" >/dev/null 2>&1

    PORT=$PORT pm2 start npm --name "$APP_NAME" -- start

    pm2 save

    echo -e "${GREEN}Panel Running on Port: $PORT${NC}"
}

# ---------- ADMIN SETUP (FIXED) ----------
admin_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Run install first."; return; }

    echo "====== ADMIN SETUP ======"

    read -p "Username: " USERNAME
    read -p "Password: " PASSWORD
    read -p "Email: " EMAIL
    read -p "First Name: " FIRST
    read -p "Last Name: " LAST

    mkdir -p "$FOLDER"

cat > "$FOLDER/admin.json" <<EOF
{
  "username": "$USERNAME",
  "password": "$PASSWORD",
  "email": "$EMAIL",
  "first_name": "$FIRST",
  "last_name": "$LAST"
}
EOF

    echo -e "${GREEN}admin.json created successfully${NC}"
}

# ---------- NODE SETUP (FIXED) ----------
node_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Run install first."; return; }

    echo "====== NODE SETUP ======"

    read -p "Node Token: " TOKEN
    read -p "Token ID: " TOKEN_ID
    read -p "Panel Link: " PANEL_LINK
    read -p "Panel ID: " PANEL_ID

cat > "$FOLDER/nodes.json" <<EOF
{
  "token": "$TOKEN",
  "token_id": "$TOKEN_ID",
  "panel_link": "$PANEL_LINK",
  "panel_id": "$PANEL_ID"
}
EOF

    mkdir -p "$FOLDER/servers"

    echo -e "${GREEN}nodes.json created successfully${NC}"
}

# ---------- Restart ----------
restart() {
    pm2 restart "$APP_NAME"
}

# ---------- Logs ----------
logs() {
    pm2 logs "$APP_NAME"
}

# ---------- Menu ----------
while true
do
clear
echo "=================================="
echo "        HILOS HOST PANEL         "
echo "=================================="
echo "1) Install / Run Panel"
echo "2) Admin Setup"
echo "3) Node Setup"
echo "4) Restart"
echo "5) Logs"
echo "6) Exit"
echo "=================================="

read -p "Select: " opt

case $opt in
1) install_app ;;
2) admin_setup ;;
3) node_setup ;;
4) restart ;;
5) logs ;;
6) exit ;;
*) echo "Invalid" ;;
esac

read -p "Press Enter..."
done
