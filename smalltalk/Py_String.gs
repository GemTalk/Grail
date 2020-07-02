! ------------------- Remove existing behavior from Py_String
expectvalue /Metaclass3       
doit
Py_String removeAllMethods.
Py_String class removeAllMethods.
%
! ------------------- Class methods for Py_String
! ------------------- Instance methods for Py_String
set compile_env: 0
category: 'other'
method: Py_String
split: arguments keywords: keywords
	"string.split(separator, max)

		The split() method splits a string into a list.

		You can specify the separator, default separator is any whitespace.

		Note: When max is specified, the list will contain the specified number of elements plus one.

		separator	Optional. Specifies the separator to use when splitting the string. Default value is a whitespace
		max	Optional. Specifies how many splits to do. Default value is -1, which is ""all occurrences"""
	
^Py_List withAll: self subStrings
%
