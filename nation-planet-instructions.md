# Remote Development with Nation Planet

## Step 1 : Set up Google Cloud VM

### Preparation
- Go to https://console.cloud.google.com/ and log in with your OLE Google account.
- Sign up, choose individual account, for organizational use. You may need a credit card/debit card to verify you are a real person. A charge and refund in the amount less than $2 will show up on your card transaction history. You will need the code in the purchase description to verify. There’s no risk of getting charged in the future if you do not click on “Activate full account” within Google Cloud Console.
- Search for “Compute Engine API,” enable and wait for it to activate
- Search for “Metadata Compute Engine,” go to “SSH KEYS” tab
  - Add your public key there. If the key does not already include a comment, you’ll need to append ` name` to the key to comply with Google’s format rules.
  - Adding it manually to `authorized_keys` in the VM would not work as it will get it overridden over time.
- Search for “Firewall VPC Network,” click on “CREATE FIREWALL RULE” button
    - Name: `planetdev-rules`
    - Action on match - Allow - “Targets” dropdown - select “All instances in the network”
    - Under “Source IPv4 Range”, enter `0.0.0.0/0`
    - Under ”Protocols and ports”, check TCP, enter `2200,3000,5000` (ports for couchdb, default `ng serve` port, and chatpi)
    - Click on the blue “Create” button

### Create Instance
- Go to “[Compute Engine](https://console.cloud.google.com/compute/overview)”, click on “Create Instance” button
- Select a location near you, price typically ranges between $25 - $35 a month
- Leave everything else to default, 4GB of RAM and Debian 12 works for us
- Click on the “Create” button

### Configuration and Installation
- Once the instance is up and running, try to ssh into the vm from your terminal
- Tools installation
    - Install git, unzip: `apt-get update && apt-get install git unzip`
    - Install docker https://docs.docker.com/engine/install/debian/#install-using-the-repository
- Follow https://open-learning-exchange.github.io/#!pages/vi/vi-docker-development-tutorial.md
  - Ensure you are running as a regular user instead of root user while installing node.js
  - When you are ready to run `ng serve`, start up a screen session with `screen`, run `ng serve`, once you verified it’s working, use `ctrl + a` then press `d` to detach and keep it running
- Configure your planet as a nation (instead of community, select nation from the dropdown), please avoid password that are too simple or common (12345, abc, 000, admin)
- Share your vm IP address and username/pw with us at [this google sheet](https://docs.google.com/spreadsheets/d/1FTyV0i358eCB1cSCQkknjJq22cbtBTXQceL-GNuerS8/edit?gid=569549482#gid=569549482) and let us know our Discord server!

## Step 2 : Setting up your dev environment 

- Install the following extensions in VS Code
    - Microsoft Remote Explorer
    - Microsoft Remote Development
- Connect you IDE to the VM
    - Under the Remote explorer tab, add new remote connection via the plus sign.
    - Type in the IP of your cloud VM.
    - Specify the location of your ssh config when prompted.
    - Select Linux as the platform of the host machine.
- Open the Planet folder to begin editing. 

## Troubleshooting

### Permission denied (publickey).

- Ensure the SSH agent is running:
    ```
    eval $(ssh-agent -s)
    ```

- Add the key to the agent:
    ```
    ssh-add ~/.ssh/<your-key-name>
    ```

- Verify the key is added:
    ```
    ssh-add -l
    ```
- Alternatively:
    - Generate a New SSH Key Pair:

      ```
      ssh-keygen -t ed25519 -C "your_email@example.com" -N "" -f ~/.ssh/<your-key-name>
      ```
    - Add the New Key to the SSH Agent:

      ```bash
      eval $(ssh-agent -s)
      ssh-add ~/.ssh/<your-key-name>
      ```
    - Verify the Key is Added:

      ```
      ssh-add -l
      ```

- Copy the Public Key to Google Cloud: Display the public key:
    ```
    cat ~/.ssh/<your-key-name>.pub
    ```

- Add the output to the SSH keys section in your Google Cloud VM.

- Connect to the VM via SSH: 
    ``` 
    ssh -A -i ~/.ssh/<your-key-name> <username>@<vm-ip-address>
    ```  
    
### Issues with remote explorer in VS Code

- Install the Remote - SSH Extension:
- Open the Command Palette (Ctrl+Shift+P).
- Type Remote-SSH: Open Configuration File... and select it.
- Choose the SSH configuration file to edit (usually ~/.ssh/config).
- Add Your VM to the SSH Config File:
- Add an entry for your Google Cloud VM in the SSH config file:
    - Host google-cloud-vm
    - HostName `<vm-ip-address>`
    - Username `<username>`
    - IdentityFile `~/.ssh/<your-key-name>`
- Connect to the VM:
- Open the Command Palette (Ctrl+Shift+P).
- Type Remote-SSH: Connect to Host... and select it.
- Choose google-cloud-vm from the list.

- Open a Folder on the Remote VM:
- Once connected, click on the "Open Folder" button in the Remote Explorer view.
  
### SSH Key Permissions:
- Ensure the permissions of your SSH key files are correct:

    ```
    chmod 600 ~/.ssh/<your-key-name>
    chmod 644 ~/.ssh/<your-key-name>.pub
    ```
