#!/bin/bash

REPO="https://github.com/b10189ahmedali-pixel/hilos-host.git"
FOLDER="hilos-host"

clear

# ---------- Colors ----------
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------- Detect App Port ----------
detect_port() {
    if grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        echo "5173"
        return
    fi

    if grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        echo "3000"
        return
    fi

    echo "8080"
}

# ---------- Install Base ----------
install_requirements() {
    sudo apt update -y
    sudo apt install -y curl git unzip build-essential ufw

    if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    sudo npm install -g pm2
}

# ---------- Open Port ----------
open_port() {
    PORT=$1
    sudo ufw allow $PORT/tcp >/dev/null 2>&1
}

# ---------- Install Files ----------
install_files() {
    clear
    echo -e "${CYAN}Installing files...${NC}"

    install_requirements

    if [ -d "$FOLDER" ]; then
        echo "Folder exists. Updating..."
        cd "$FOLDER" || exit
        git pull
    else
        git clone "$REPO"
        cd "$FOLDER" || exit
    fi

    npm install

    PORT=$(detect_port)

    echo ""
    echo "Detected App Port: $PORT"

    open_port $PORT

    # Kill old process
    pm2 delete hitlosa >/dev/null 2>&1

    # React CRA
    if grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        PORT=$PORT pm2 start npm --name hitlosa -- start

    # Vite
    elif grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        pm2 start "npm run dev -- --host 0.0.0.0 --port $PORT" --name hitlosa

    # Fallback
    else
        PORT=$PORT pm2 start npm --name hitlosa -- start
    fi

    pm2 save

    echo ""
    echo -e "${GREEN}Files Installed Successfully${NC}"
    echo -e "${GREEN}Running on Port: $PORT${NC}"
}

# ---------- Admin Setup ----------
admin_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Install files first."; return; }

    echo "====== ADMIN SETUP ======"
    read -p "Username: " USERNAME
    read -p "Password: " PASSWORD
    read -p "Email: " EMAIL
    read -p "First Name: " FIRST
    read -p "Last Name: " LAST

cat > admin.json <<EOF
{
  "username":"$USERNAME",
  "password":"$PASSWORD",
  "email":"$EMAIL",
  "first_name":"$FIRST",
  "last_name":"$LAST"
}
EOF

    echo -e "${GREEN}Admin Setup Completed${NC}"
}

# ---------- Node Setup ----------
node_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Install files first."; return; }

    echo "====== NODE SETUP ======"
    read -p "Node Token: " TOKEN
    read -p "Token ID: " TOKENID
    read -p "Panel Link: " PANEL
    read -p "Panel ID: " PANELID

cat > nodes.json <<EOF
{
  "token":"$TOKEN",
  "token_id":"$TOKENID",
  "panel_link":"$PANEL",
  "panel_id":"$PANELID"
}
EOF

    mkdir -p servers

    echo -e "${GREEN}Node Setup Completed${NC}"
}

# ---------- Menu ----------
while true
do
clear
echo "=================================="
echo "        HITLOSA INSTALLER         "
echo "=================================="
echo "1) Install Files + Run Panel"
echo "2) Admin Setup"
echo "3) Node Setup"
echo "4) Restart Panel"
echo "5) View Logs"
echo "6) Exit"
echo "=================================="
read -p "Select Option: " choice

case $choice in
1) install_files ;;
2) admin_setup ;;
3) node_setup ;;
4) pm2 restart hitlosa ;;
5) pm2 logs hitlosa ;;
6) exit ;;
*) echo "Invalid Option" ;;
esac

read -p "Press Enter To Continue..."
done
