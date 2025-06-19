#!/bin/bash
# Usage: ./debug_test.sh crates/handlers upstream_oauth2::link::tests::test_link_existing_account
set -e

cd $MAS_TCHAP_HOME

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <crate_path> <test_function_name>"
  echo "Example: $0 crates/mas-handlers test_valid_token_flow"
  exit 1
fi

CRATE_DIR="$1"
TEST_NAME="$2"

# Compile the tests for the crate
echo "🔧 Building tests for crate: $CRATE_DIR"
cd "$CRATE_DIR"
cargo test --no-run

# Get crate name from Cargo.toml
CRATE_NAME=$(grep '^name' Cargo.toml | head -n1 | cut -d '"' -f2)
# Derive expected test binary name (Cargo replaces '-' with '_')
BINARY_NAME="${CRATE_NAME//-/_}"

# Get the correct test binary path
BIN_PATH=$(cargo test --no-run --message-format=json \
  | jq -r --arg name "$BINARY_NAME" '
      select(.profile.test == true and .target.name == $name) 
      | .executable
  ')

if [[ ! -x "$BIN_PATH" ]]; then
  echo "❌ Could not find test binary."
  exit 2
fi

echo "✅ Test binary: $BIN_PATH"

# Go back to workspace root
cd - > /dev/null

# Ensure .vscode exists
mkdir -p .vscode

# Write launch.json
cat > .vscode/launch.json <<EOF
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug test '$TEST_NAME' in $CRATE_DIR",
      "type": "lldb",
      "request": "launch",
      "program": "$BIN_PATH",
      "args": ["$TEST_NAME", "--exact", "--nocapture"],
      "cwd": "\${workspaceFolder}",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost/test"
      },
      "sourceLanguages": ["rust"]
    }
  ]
}
EOF

echo "🚀 launch.json created at .vscode/launch.json"
echo "🧪 Ready to debug test: $TEST_NAME"
