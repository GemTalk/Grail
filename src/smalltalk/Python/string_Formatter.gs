! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- string_formatter class (Python 'string.Formatter' type)
expectvalue /Class
doit
object subclass: 'string_formatter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
string_formatter comment:
'Python string.Formatter class.

This class provides a way to create and customize your own string formatting
behavior using the same mechanism as the built-in format() function and
str.format() method.

The Formatter class has the following public methods:
- format(format_string, *args, **kwargs): Format a string
- vformat(format_string, args, kwargs): Format using args and kwargs dicts
- parse(format_string): Parse format string into tuples
- get_field(field_name, args, kwargs): Get field value
- get_value(key, args, kwargs): Get value for a key
- format_field(value, format_spec): Format a single field
- convert_field(value, conversion): Convert field value
- check_unused_args(used_args, args, kwargs): Check for unused args

See https://docs.python.org/3/library/string.html#string.Formatter for documentation.
'
%

expectvalue /Class
doit
string_formatter category: 'Modules-String'
%

! ===============================================================================
! string_formatter Methods (Python 'string.Formatter' type)
! ===============================================================================
! This file contains method implementations for the string_formatter class.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from string_formatter
expectvalue /Metaclass3
doit
string_formatter removeAllMethods: 1.
string_formatter class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Type'
method: string_formatter
__class__
	"Return the Python type for string.Formatter"
	^ string_formatter
%

category: 'Python-Formatting'
method: string_formatter
check_unused_args: used_args _: args _: keywords
	"Check for unused arguments and raise ValueError if any are found.
	In Python: formatter.check_unused_args(used_args, args, kwargs)"

	| unused_pos unused_kw |
	unused_pos := list ___new___.
	unused_kw := list ___new___.
	
	"Check positional args"
	1 @env0:to: args ___size___ do: [:i |
		| arg_index |
		arg_index := i ___minus___: 1.  "0-based index"
		(used_args ___includes___: arg_index) ifFalse: [
			unused_pos append: arg_index
		]
	].
	
	"Check keyword args"
	keywords @env0:keysDo: [:key |
		(used_args ___includes___: key) ifFalse: [
			unused_kw append: key
		]
	].
	
	"Raise error if unused args found"
	(((unused_pos ___size___) ___gt___: 0) or: [
		(unused_kw ___size___) ___gt___: 0
	]) ifTrue: [
		| error_msg |
		error_msg := 'Unused argument(s): '.
		(((unused_pos ___size___) ___gt___: 0)) ifTrue: [
			error_msg := error_msg ___concat___: 'positional '.
			error_msg := error_msg ___concat___: (unused_pos @env1:__str__)
		].
		(((unused_kw ___size___) ___gt___: 0)) ifTrue: [
			(((unused_pos ___size___) ___gt___: 0)) ifTrue: [
				error_msg := error_msg ___concat___: ', '
			].
			error_msg := error_msg ___concat___: 'keyword '.
			error_msg := error_msg ___concat___: (unused_kw @env1:__str__)
		].
		ValueError ___signal___: error_msg
	]
%

category: 'Python-Formatting'
method: string_formatter
convert_field: value _: conversion
	"Convert a field value according to conversion specifier.
	conversion can be 'r' (repr), 's' (str), or 'a' (ascii)."

	| conv_char |
	conv_char := conversion ___at___: 1.
	
	((conv_char ___eq___: $r)) ifTrue: [
		^ value @env1:__repr__
	] ifFalse: [
		((conv_char ___eq___: $s)) ifTrue: [
			^ value @env1:__str__
		] ifFalse: [
			((conv_char ___eq___: $a)) ifTrue: [
				"ASCII conversion - same as repr for now"
				^ value @env1:__repr__
			] ifFalse: [
				ValueError ___signal___: ('Unknown conversion specifier: ' ___concat___: conversion)
			]
		]
	]
%

category: 'Python-Formatting'
method: string_formatter
format: format_string _: args _: keywords
	"Format a string using the format string and arguments.
	In Python: formatter.format(format_string, *args, **kwargs)"

	^ self vformat: format_string _: args _: keywords
%

category: 'Python-Formatting'
method: string_formatter
format_field: value _: format_spec _: conversion
	"Format a field value according to format_spec and conversion.
	In Python: formatter.format_field(value, format_spec, conversion)"

	| converted_value |
	
	"Apply conversion if specified"
	conversion == nil ifFalse: [
		converted_value := self convert_field: value _: conversion.
	] ifTrue: [
		converted_value := value
	].
	
	"Apply format spec if specified"
	format_spec == nil ifTrue: [
		^ converted_value @env1:__str__
	] ifFalse: [
		^ converted_value @env1:__format__: format_spec
	]
%

category: 'Python-Formatting'
method: string_formatter
get_field: field_name _: args _: keywords
	"Get the value for a field name from args or keywords.
	Returns a tuple (obj, used_key) where used_key is the key used to get the value."

	| field_name_str used_key value is_int int_value char_code |
	field_name_str := field_name.
	
	"Empty field name means auto-numbering (not supported in this basic implementation)"
	"Try to parse as integer (positional arg)"
	is_int := true.
	int_value := 0.
	((((field_name_str ___size___) ___gt___: 0))) ifTrue: [
		field_name_str ___do___: [:char |
			char_code := char ___codePoint___.
			((char_code ___ge___: 48) and: [char_code ___le___: 57]) ifFalse: [
				is_int := false
			] ifTrue: [
				int_value := (int_value ___times___: 10) ___plus___: (char_code ___minus___: 48)
			]
		]
	] ifFalse: [
		is_int := false
	].
	
	is_int ifTrue: [
		"Positional argument"
		used_key := int_value.
		((int_value ___ge___: (args ___size___))) ifTrue: [
			IndexError ___signal___: 'Replacement index out of range'
		].
		value := args ___at___: (int_value ___plus___: 1)  "1-based indexing"
	] ifFalse: [
		"Keyword argument or empty (auto-numbering not fully supported)"
		(((field_name_str ___size___) ___eq___: 0)) ifTrue: [
			"Auto-numbering - use first unused positional arg (simplified)"
			used_key := 0.
			(((args ___size___) ___gt___: 0)) ifTrue: [
				value := args ___at___: 1
			] ifFalse: [
				IndexError ___signal___: 'Replacement index out of range'
			]
		] ifFalse: [
			"Keyword argument"
			used_key := field_name_str.
			value := keywords ___at___: field_name_str ifAbsent: [
				KeyError ___signal___: field_name_str
			]
		]
	].
	
	^ tuple ___with___: value with: used_key
%

category: 'Python-Formatting'
method: string_formatter
get_value: key _: args _: keywords
	"Get value for a key from args or keywords.
	key can be an integer (for positional args) or a string (for keyword args)."

	(key ___isKindOf___: int) ifTrue: [
		(key ___ge___: (args ___size___)) ifTrue: [
			IndexError ___signal___: 'Replacement index out of range'
		].
		^ args ___at___: (key ___plus___: 1)  "1-based indexing"
	] ifFalse: [
		^ keywords ___at___: key ifAbsent: [
			KeyError ___signal___: key
		]
	]
%

category: 'Python-Formatting'
method: string_formatter
parse: format_string do: aBlock
	"Parse format string and call block for each field.
	Block receives: literal_text, field_name, format_spec, conversion"

	| i len literal_text field_name format_spec conversion char conv_char conv_str nextChar char_char char_str spec_char spec_str field_name_str format_spec_str |
	i := 1.
	len := format_string ___size___.
	literal_text := str ___new___.
	
	[i ___le___: len] ___whileTrue___: [
		char := format_string ___at___: i.
		
		((char ___eq___: ${)) ifTrue: [
			"Start of field - save literal text"
			aBlock value: literal_text value: nil value: nil value: nil.
			literal_text := str ___new___.
			
			"Parse field name"
			i := i ___plus___: 1.
			((i ___gt___: len)) ifTrue: [
				ValueError ___signal___: 'Single "{" encountered in format string'
			].
			
			field_name := str ___new___.
			format_spec := str ___new___.
			conversion := nil.
			
			"Check for conversion"
			((format_string ___at___: i) ___eq___: $!) ifTrue: [
				i := i ___plus___: 1.
				((i ___gt___: len)) ifTrue: [
					ValueError ___signal___: 'Expected conversion specifier after "!"'
				].
				conv_char := format_string ___at___: i.
				conv_str := str ___new___: 1.
				conv_str ___at___: 1 put: conv_char.
				conversion := conv_str.
				i := i ___plus___: 1.
			].
			
			"Parse field name and format spec"
			[(i ___le___: len) ifTrue: [
				nextChar := format_string ___at___: i.
				((nextChar ___ne___: $}) ifTrue: [
					nextChar ___ne___: $:
				] ifFalse: [false])
			] ifFalse: [false]] ___whileTrue___: [
				char_char := format_string ___at___: i.
				char_str := str ___new___: 1.
				char_str ___at___: 1 put: char_char.
				field_name := field_name ___concat___: char_str.
				i := i ___plus___: 1
			].
			
			"Check for format spec"
			((i ___le___: len)) ifTrue: [
				(((format_string ___at___: i) ___eq___: $:)) ifTrue: [
					i := i ___plus___: 1.
					[(i ___le___: len) ifTrue: [
						(format_string ___at___: i) ___ne___: $}
					] ifFalse: [false]] ___whileTrue___: [
						spec_char := format_string ___at___: i.
						spec_str := str ___new___: 1.
						spec_str ___at___: 1 put: spec_char.
						format_spec := format_spec ___concat___: spec_str.
						i := i ___plus___: 1
					]
				]
			].
			
			"Expect closing brace"
			((i ___gt___: len)) ifTrue: [
				ValueError ___signal___: 'Expected "}" to match "{"'
			].
			(((format_string ___at___: i) ___ne___: $})) ifTrue: [
				ValueError ___signal___: 'Expected "}" to match "{"'
			].
			
			"Call block with parsed field"
			field_name_str := (((field_name ___size___) ___gt___: 0)) ifTrue: [field_name] ifFalse: [nil].
			format_spec_str := (((format_spec ___size___) ___gt___: 0)) ifTrue: [format_spec] ifFalse: [nil].
			aBlock value: str ___new___ value: field_name_str value: format_spec_str value: conversion.
			
			i := i ___plus___: 1
		] ifFalse: [
			"Regular character - add to literal text"
			char_str := str ___new___: 1.
			char_str ___at___: 1 put: char.
			literal_text := literal_text ___concat___: char_str.
			i := i ___plus___: 1
		]
	].
	
	"Add remaining literal text"
	(((literal_text ___size___) ___gt___: 0)) ifTrue: [
		aBlock value: literal_text value: nil value: nil value: nil
	]
%

category: 'Python-Formatting'
method: string_formatter
vformat: format_string _: args _: keywords
	"Format a string using args tuple and keywords dictionary.
	In Python: formatter.vformat(format_string, args, kwargs)"

	| result used_args |
	result := str ___new___.
	used_args := set ___new___.
	
	"Parse the format string and process each field"
	self parse: format_string do: [:literal_text :field_name :format_spec :conversion |
		| field_tuple field_value used_key formatted_value |
		
		"Add literal text"
		result := result ___concat___: literal_text.
		
		"Process field if present"
		field_name == nil ifFalse: [
			field_tuple := self get_field: field_name _: args _: keywords.
			field_value := field_tuple ___at___: 1.
			used_key := field_tuple ___at___: 2.
			formatted_value := self format_field: field_value _: format_spec _: conversion.
			result := result ___concat___: formatted_value.
			
			"Track used args"
			used_args add: used_key
		]
	].
	
	"Check for unused args (disabled for now - Python's Formatter doesn't check by default)"
	"self check_unused_args: used_args _: args _: keywords."
	
	^ result
%

set compile_env: 0
