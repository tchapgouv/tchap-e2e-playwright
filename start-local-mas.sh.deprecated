#!/bin/bash
# runs the MAS at the path : $MAS_HOME
# before running the server :
# - build the config
# - build the template
# - runs sanity check on the templates

set -e

# Source the .env file to load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found. Please create a .env file with the required environment variables."
  exit 1
fi

# Check if MAS_HOME is defined
if [ -z "$MAS_HOME" ]; then
    echo "Error: MAS_HOME environment variable is not defined"
    echo "Please set MAS_HOME to the path of your matrix-authentication-service directory"
    exit 1
fi

export MAS_HOME=$MAS_HOME
export MAS_TCHAP_HOME=$PWD
cd $MAS_HOME

# Build conf from conf.template.yaml
$MAS_TCHAP_HOME/tools/build_conf.sh

export RUST_LOG=info

# Start the server
echo "Checking templates..."
cargo run -- templates check -c $MAS_TCHAP_HOME/tmp/config.local.dev.yaml 

cargo run -- server -c $MAS_TCHAP_HOME/tmp/config.local.dev.yaml 

