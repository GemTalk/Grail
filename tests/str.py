#!/usr/local/bin/python3
# https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str

# capitalize
assert('string'.capitalize() == 'String')
assert('sTRING'.capitalize() == 'String')
assert('s'.capitalize() == 'S')
assert(' '.capitalize() == ' ')
assert(' s'.capitalize() == ' s')

# casefold
assert('String'.casefold() == 'string')
assert('S'.casefold() == 's')
assert(' '.casefold() == ' ')
assert('sTrInG'.casefold() == 'string')

# center
assert('string'.center(8,' ') == ' string ')
assert('string'.center(7,' ') == ' string')
assert('string'.center(6,' ') == 'string')
assert('string'.center(1,' ') == 'string')
assert('string'.center(10,'*') == '**string**')

# count
assert('string'.count('str') == 1)
assert('stringstring'.count('str') == 2)
assert('string'.count('') == 7) # Why 7? end char?
assert('stringstring'.count('str',0,3) == 1)
assert('stringstring'.count('',0,3) == 4)
assert('stringstring'.count('ing',3,12) == 2)

# encode

# endswith
assert('string'.endswith('ing') == True)
assert('string'.endswith(('n','g')) == True)
assert('string'.endswith(('ing','str'), 3,6) == True)

# expandtabs \t default is two spaces for current tests 
assert('string'.expandtabs() == 'string')
assert('string\t'.expandtabs() == 'string  ')
assert('string\t'.expandtabs(1) == 'string ')
assert('\tstring\t'.expandtabs(2) == '  string  ')

# find
assert('string'.find('tri') == True)
assert('string'.find('tri',0,1) == -1)
assert('string'.find('tri',1,4) == True)
assert(''.find('tri',1,4) == -1)
