#!/bin/bash

set -e

# Check if MAS_HOME is defined
if [ -z "$MAS_HOME" ]; then
    echo "Error: MAS_HOME environment variable is not defined"
    echo "Please set MAS_HOME to the path of your matrix-authentication-service directory"
    exit 1
fi

MAS_CONF=$PWD/conf
cd $MAS_HOME
cargo run -- server -c $MAS_CONF/config.local.dev.yaml
