! ------------------- Remove existing behavior from PyString
expectvalue /Metaclass3       
doit
PyString removeAllMethods.
PyString class removeAllMethods.
%
! ------------------- Class methods for PyString
! ------------------- Instance methods for PyString
set compile_env: 0
category: 'other'
method: PyString
__str__

	^self
%
category: 'other'
method: PyString
split: arguments keywords: keywords
	"string.split(separator, max)

		The split() method splits a string into a list.

		You can specify the separator, default separator is any whitespace.

		Note: When max is specified, the list will contain the specified number of elements plus one.

		separator	Optional. Specifies the separator to use when splitting the string. Default value is a whitespace
		max	Optional. Specifies how many splits to do. Default value is -1, which is ""all occurrences"""
	
^List withAll: self subStrings
%
