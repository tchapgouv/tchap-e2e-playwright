#!/bin/bash

set -e

# Check if SYNAPSE_CONFIG_DIRECTORY is defined
if [ -z "$SYNAPSE_CONFIG_DIRECTORY" ]; then
    echo "Error: SYNAPSE_CONFIG_DIRECTORY environment variable is not defined"
    echo "Please set SYNAPSE_CONFIG_DIRECTORY to the path of your synapse directory"
    exit 1
fi

cargo run -- config sync -c $MAS_TCHAP_HOME/tmp/config.local.dev.yaml
syn2mas --command migrate --synapseConfigFile $SYNAPSE_CONFIG_DIRECTORY/homeserver.yaml --masConfigFile $MAS_TCHAP_HOME/tmp/config.local.dev.yaml --dryRun
