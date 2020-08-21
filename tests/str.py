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

# format
assert('string {0}'.format('tri') == 'string tri')
assert('string {0}'.format(1+2) == 'string 3')
assert('string {:n}'.format(1234) == 'string 1234')

# format_map

# index
assert('string'.index('tri') == True)
assert('string'.index('tri',1,4) == True)

# isalnum
assert('sting'.isalnum() == True)
assert('sting#'.isalnum() == False)
assert('sting123'.isalnum() == True)
assert(''.isalnum() == False)
assert(' '.isalnum() == False)

# isalpha
assert('sting'.isalpha() == True)
assert('sting#'.isalpha() == False)
assert('sting123'.isalpha() == False)
assert(''.isalpha() == False)
assert(' '.isalpha() == False)

# isascii
assert('sting'.isascii() == True)
assert('sting#'.isascii() == True)
assert('sting123'.isascii() == True)
assert(''.isascii() == True)
assert(' '.isascii() == True)

# isdecimal
assert('0'.isdecimal() == True)
assert('string'.isdecimal() == False)
assert('³'.isdecimal() == False)
assert('99'.isdecimal() == True)
assert('½'.isnumeric() == True)

# isdidgit
assert('0'.isdigit() == True)
assert('string'.isdigit() == False)
assert('³'.isdigit() == True)
assert('99'.isdigit() == True)
assert('½'.isnumeric() == True)

# isidentifier
assert('Foo Bar'.isidentifier() == False)
assert('FooBar'.isidentifier() == True)
assert('.FooBar'.isidentifier() == False)

# islower
assert('string'.islower() == True)
assert('String'.islower() == False)
assert('2'.islower() == False)
assert(''.islower() == False)

# isnumeric
assert('0'.isnumeric() == True)
assert('string'.isnumeric() == False)
assert('³'.isnumeric() == True)
assert('½'.isnumeric() == True)
assert('99'.isnumeric() == True)

# isprintable
assert('\t'.isprintable() == False)
assert('string'.isprintable() == True)
assert(''.isprintable() == True)
assert('1 2 3'.isprintable() == True)

# isspace
assert(''.isspace() == False)
assert(' '.isspace() == True)
assert(' s'.isspace() == False)
assert('     '.isspace() == True)
assert('\t'.isspace() == True)

# istitle
assert('String'.istitle() == True)
assert('STring'.istitle() == False)
assert('St ring'.istitle() == False)
assert(''.istitle() == False)
assert('33'.istitle() == False)
assert('String@'.istitle() == True)

# isupper
assert('STRING'.isupper() == True)
assert('String'.isupper() == False)
assert('2'.isupper() == False)
assert(''.isupper() == False)
