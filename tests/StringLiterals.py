#!/usr/local/bin/python3
# https://docs.python.org/3/reference/lexical_analysis.html#string-and-bytes-literals

# shortstring
'abcde'
"vwxyz"

# longstring
'''qwer
asdf'''
"""poiu
;lkj"""

# embedded quotes
'x"yz'
"a'bc"

# escape sequences
r'slash\\'
r"newline\n"

# non-escape sequences
'slash\\'
"newline\n"

# formatting
f"abc{'def'}ghi"
f"123{456}789"

# byte prefix
b"abc\n" 
b"""def\\"""

# byte prefix with 3 character escape sequences
b"abc\a"
b"def\b"

# byte prefix with octal
b"""abc\000"""
b"""def\777"""

# byte prefix with hex
b"""abc\x00"""
b"""def\xff"""

