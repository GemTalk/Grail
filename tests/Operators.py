#!/usr/local/bin/python3
# https://docs.python.org/3/reference/lexical_analysis.html#operators

# binary operators
1 + 2 # 1
1 & 1 # 2
1 | 1 # 3
1 ^ 0 # 4
1 << 2 # 5
4 >> 2 # 6
10 % 5 # 7
10 / 5 # 8
3 // 2 # 9
2 - 1 # 10
2 ** 4 # 11

# nested binary operators
2 + 4 + 6 # 12
7 * 8 * 9 # 13

# unary operators
-100 # 14
~200 # 15
+100 # 16
not False # 17

# nested unary operators
-+300 # 18
~~400 # 19

# comparison operators
10 == 20 # 20
25 >= 15 # 21
25 > 15 # 22
25 < 15 # 23
15 <= 25 # 24
15 != 15 # 25
False is True # 26
False is not True # 27
3 in [1, 2, 3] # 28
3 not in [1, 2, 3] # 29



# nested comparison operators
11 == 22 == 33 == 44 # 30
44 >= 55 >= 66 # 31

'he' in 'hello' in 'hello world' == 'hello world' # 32
