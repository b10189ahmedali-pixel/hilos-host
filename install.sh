#!/bin/bash

REPO="https://github.com/b10189ahmedali-pixel/hilos-host.git"
FOLDER="hilos-host"
APP_NAME="hiloshost"

clear

# ---------- Colors ----------
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------- Detect Port ----------
detect_port() {
    if grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        echo "5173"
        return
    fi

    if grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        echo "3000"
        return
    fi

    if grep -q "\"start\":" package.json 2>/dev/null; then
        echo "8080"
        return
    fi

    echo "8080"
}

# ---------- Install Requirements ----------
install_requirements() {
    echo -e "${CYAN}Installing requirements...${NC}"

    sudo apt update -y
    sudo apt install -y curl git unzip build-essential ufw

    if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    if ! command -v pm2 >/dev/null 2>&1; then
        sudo npm install -g pm2
    fi
}

# ---------- Firewall ----------
open_port() {
    PORT=$1
    sudo ufw allow "$PORT"/tcp >/dev/null 2>&1
}

# ---------- Clone / Update ----------
clone_or_update() {
    if [ -d "$FOLDER/.git" ]; then
        echo -e "${YELLOW}Repository exists. Updating...${NC}"
        cd "$FOLDER" || exit
        git reset --hard
        git pull
    else
        git clone "$REPO"
        cd "$FOLDER" || exit
    fi
}

# ---------- Start App ----------
start_app() {
    PORT=$(detect_port)

    echo -e "${CYAN}Detected Port: $PORT${NC}"

    open_port "$PORT"

    pm2 delete "$APP_NAME" >/dev/null 2>&1

    if grep -q "\"dev\":.*vite" package.json 2>/dev/null; then
        pm2 start "npm run dev -- --host 0.0.0.0 --port $PORT" --name "$APP_NAME"

    elif grep -q "\"start\":.*react-scripts" package.json 2>/dev/null; then
        PORT=$PORT pm2 start npm --name "$APP_NAME" -- start

    elif grep -q "\"start\":" package.json 2>/dev/null; then
        PORT=$PORT pm2 start npm --name "$APP_NAME" -- start

    else
        echo -e "${RED}No runnable script found in package.json${NC}"
        return
    fi

    pm2 save

    echo ""
    echo -e "${GREEN}Application Started Successfully${NC}"
    echo -e "${GREEN}Running on Port: $PORT${NC}"
}

# ---------- Install Files ----------
install_files() {
    clear
    install_requirements
    clone_or_update

    echo -e "${CYAN}Installing npm packages...${NC}"
    npm install

    start_app
}

# ---------- Admin Setup ----------
admin_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Install files first."; return; }

    echo "========== ADMIN SETUP =========="
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

    echo -e "${GREEN}Admin file created successfully.${NC}"
}

# ---------- Node Setup ----------
node_setup() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Install files first."; return; }

    echo "========== NODE SETUP =========="
    read -p "Node Token: " TOKEN
    read -p "Token ID: " TOKENID
    read -p "Panel Link: " PANEL
    read -p "Panel ID: " PANELID

cat > nodes.json <<EOF
{
  "token": "$TOKEN",
  "token_id": "$TOKENID",
  "panel_link": "$PANEL",
  "panel_id": "$PANELID"
}
EOF

    mkdir -p servers

    echo -e "${GREEN}Node configuration saved.${NC}"
}

# ---------- Start Node ----------
start_node() {
    clear
    cd "$FOLDER" 2>/dev/null || { echo "Install files first."; return; }

    if [ ! -f nodes.json ] || [ ! -f nodes-server.json ]; then
        echo -e "${RED}Required node files missing.${NC}"
        return
    fi

    TOKEN1=$(jq -r '.token' nodes.json)
    TOKENID1=$(jq -r '.token_id' nodes.json)
    PANEL1=$(jq -r '.panel_link' nodes.json)
    PANELID1=$(jq -r '.panel_id' nodes.json)

    TOKEN2=$(jq -r '.token' nodes-server.json)
    TOKENID2=$(jq -r '.token_id' nodes-server.json)
    PANEL2=$(jq -r '.panel_link' nodes-server.json)
    PANELID2=$(jq -r '.panel_id' nodes-server.json)

    if [[ "$TOKEN1" == "$TOKEN2" && "$TOKENID1" == "$TOKENID2" && "$PANEL1" == "$PANEL2" && "$PANELID1" == "$PANELID2" ]]; then
        
cat >> nodes-server.json <<EOF

{
 "STATUS":"ONLINE"
}
EOF

        echo -e "${GREEN}Node started (STATUS added).${NC}"
    else
        echo -e "${RED}Node credentials do not match.${NC}"
    fi
}

# ---------- Restart ----------
restart_panel() {
    pm2 restart "$APP_NAME"
}

# ---------- Logs ----------
view_logs() {
    pm2 logs "$APP_NAME"
}

# ---------- Menu ----------
while true
do
clear
echo "======================================"
echo "         HILOS HOST INSTALLER         "
echo "======================================"
echo "1) Install / Update Files + Run"
echo "2) Admin Setup"
echo "3) Node Setup"
echo "4) Restart Panel"
echo "5) View Logs"
echo "6) PM2 Status"
echo "7) Start Node"
echo "8) Exit"
echo "======================================"

read -p "Select Option: " choice

case $choice in
1) install_files ;;
2) admin_setup ;;
3) node_setup ;;
4) restart_panel ;;
5) view_logs ;;
6) pm2 status ;;
7) start_node ;;
8) exit ;;
*) echo "Invalid Option" ;;
esac

read -p "Press Enter To Continue..."
done
