#!/bin/bash
# Check for common parenthesis issues in Grail Smalltalk code

# Helper function to check if a line contains text in double quotes (comment)
is_in_comment() {
    local line="$1"
    local pattern="$2"
    # Extract filename and line number
    local file=$(echo "$line" | cut -d: -f1)
    local line_num=$(echo "$line" | cut -d: -f2)
    # Extract the file content part (after filename:line:)
    local content=$(echo "$line" | sed 's/^[^:]*:[^:]*://')
    
    # Check if the entire line is a comment (starts with quote and space/tab)
    if echo "$content" | grep -qE '^\s*"'; then
        return 0  # Entire line is a comment
    fi
    
    # Check if this line is part of a multi-line comment
    # Count all quotes from start of file up to this line
    local total_quotes=$(head -n "$line_num" "$file" 2>/dev/null | tr -cd '"' | wc -c)
    # If odd number of quotes, we're inside a comment
    if [ $((total_quotes % 2)) -eq 1 ]; then
        return 0  # In comment
    fi
    
    # Check if pattern appears between quotes on this line
    local before=$(echo "$content" | sed "s/$pattern.*//")
    local line_quote_count=$(echo "$before" | tr -cd '"' | wc -c)
    if [ $((line_quote_count % 2)) -eq 1 ]; then
        return 0  # In comment
    fi
    return 1  # Not in comment
}

echo "=== Checking for perform:env:0 before conditionals without parentheses ==="
issues=0

# Pattern 1: perform:env:0 before ifTrue:/ifFalse: without opening parenthesis
grep -rn "perform:.*env: 0.*ifTrue:\|perform:.*env: 0.*ifFalse:" smalltalk/classes/*.gs 2>/dev/null | \
  grep -v "^.*(.*perform:" | \
  while IFS= read -r line; do
    # Skip if pattern is inside double quotes (comment)
    if is_in_comment "$line" "perform:.*env: 0.*ifTrue:" || is_in_comment "$line" "perform:.*env: 0.*ifFalse:"; then
      continue
    fi
    echo "⚠️  Potential issue: $line"
    issues=$((issues + 1))
  done

# Pattern 2: Binary operators that might need perform:env:0 (only in env: 1 code)
echo ""
echo "=== Checking for binary operators that might need perform:env:0 (env: 1 code only) ==="
for file in smalltalk/classes/*.gs; do
    # Only check files with env: 1 code
    if ! grep -q "set compile_env: 1" "$file" 2>/dev/null; then
        continue
    fi
    # Find the line numbers where env: 1 starts and ends
    env1_lines=$(grep -n "set compile_env: 1" "$file" 2>/dev/null | cut -d: -f1)
    env0_lines=$(grep -n "set compile_env: 0" "$file" 2>/dev/null | cut -d: -f1)
    if [ -z "$env1_lines" ]; then
        continue
    fi
    grep -n "[^)] > \|[^)] < \|[^)] >= \|[^)] <=" "$file" 2>/dev/null | \
      grep -v "== " | \
      grep -v "perform: #" | \
      while IFS= read -r match_line; do
        line_num=$(echo "$match_line" | cut -d: -f1)
        full_line="$file:$match_line"
        # Skip if operator is inside double quotes (comment)
        if is_in_comment "$full_line" "[><=]"; then
          continue
        fi
        # Check if this line is in an env: 1 section
        in_env1=false
        for env1_line in $env1_lines; do
          # Find the next env: 0 line after this env: 1
          next_env0=""
          for env0_line in $env0_lines; do
            if [ "$env0_line" -gt "$env1_line" ]; then
              next_env0="$env0_line"
              break
            fi
          done
          # Check if our line is between env: 1 and next env: 0 (or end of file)
          if [ "$line_num" -ge "$env1_line" ]; then
            if [ -z "$next_env0" ] || [ "$line_num" -lt "$next_env0" ]; then
              in_env1=true
              break
            fi
          fi
        done
        # Only flag if it's in env: 1 code
        if [ "$in_env1" = true ]; then
          echo "⚠️  Potential issue: $full_line"
          issues=$((issues + 1))
        fi
      done
done

# Pattern 3: Chained perform:env:0 before conditionals
echo ""
echo "=== Checking for chained perform:env:0 before conditionals ==="
grep -rn ") perform:.*env: 0.*ifTrue:\|) perform:.*env: 0.*ifFalse:" smalltalk/classes/*.gs 2>/dev/null | \
  grep -v "^.*((.*) perform:" | \
  while IFS= read -r line; do
    # Skip if pattern is inside double quotes (comment)
    if is_in_comment "$line" "perform:.*env: 0.*ifTrue:" || is_in_comment "$line" "perform:.*env: 0.*ifFalse:"; then
      continue
    fi
    # The Int.gs case is actually correct - it's inside an and: block which is already parenthesized
    if echo "$line" | grep -q "and:.*perform:.*env: 0.*ifTrue:"; then
      continue
    fi
    echo "⚠️  Potential issue: $line"
    issues=$((issues + 1))
  done

if [ $issues -eq 0 ]; then
    echo ""
    echo "✅ No obvious parenthesis issues found!"
else
    echo ""
    echo "⚠️  Found $issues potential issues. Please review manually."
fi
