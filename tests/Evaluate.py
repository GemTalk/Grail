#!/usr/local/bin/python3

# add
1 + 2
3 + 2
1 + 2 * 3
-1 + 3

# sub
3 - 1
4 - 8
5 - 1 * 2 + 1
-1 - 5

# bitAnd
0b10 & 0b01
0b101 & 0b100
0b111 & 0b011
0b1 & 0b1
0b101 & 0b100 | 0b011

# bitOr
0b10 | 0b01
0b101 | 0b100
0b111 | 0b011
0b1 | 0b1
0b101 | 0b100 & 0b011

# GT
1 > 2
3 > 2
2 > 2
5 > 4
4 > 3 + 1

# Eq
1 == 1
2 == 1
5 == 7
"hello" == "hello"
"World" == "World!!!"
"FooBar" == 42

# GtE
1 >= 2
3 >= 2
2 >= 2
5 >= 4
4 >= 3 + 2

# Lt
1 < 2
1 < 1
3 < 2
1 + 1 < 4 - 1
1 < 4 < 8

# LtE
1 <= 2
1 <= 1
3 <= 2
1 + 1 <= 4 - 1
1 <= 4 <= 8

# NotEq
1 != 1
2 != 1
5 != 7
"hello" != "hello"
"World" != "World!!!"
"FooBar" != 42

# In
3 in [1,2,3]
4 in [1,2,3]
6 in [2,5,9]
2 in [1,2,3]

# NotIn
3 not in [1,2,3]
4 not in [1,2,3]
6 not in [2,5,9]
2 not in [1,2,3]

# Mult
1 * 3
1 * 1
-5 * -5
3 * -5

# Div
5 / 2
1 / 1
4 / 2
2 / 8

# FloorDiv
5 // 2
1 // 1
4 // 2
2 // 8

# Mod
5 % 2
1 % 1
4 % 2
2 % 8

# Pow
2**3
1**5
3**3 + 1
(-2)**2

# Is
1 is 1
'test' is 'test'
[1,2] is [1,2]
5 is 5

# IsNot
1 is not 1
'test' is not 'test'
[1,2] is not [1,2]
5 is not 5

# LShift
1 << 1
1 << 2
2 << 1
3 << 1

# RShift
1 >> 1
2 >> 1
4 >> 2
5 >> 1

# Xor
0b10 ^ 0b01
0b101 ^ 0b100
0b111 ^ 0b011
0b1 ^ 0b1
0b101 ^ 0b100 | 0b011