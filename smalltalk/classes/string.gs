! ===============================================================================
! string Module (Python 'string' module)
! ===============================================================================
! This file contains the Python string module implementation.
! The string module provides string constants and utility functions.
! ===============================================================================

! ------------------- Remove existing Python methods from string
expectvalue /Metaclass3
doit
string removeAllMethods: 2.
string class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for string

category: 'Python-Initialization'
method: string
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_ascii_lowercase;
		initialize_ascii_uppercase;
		initialize_ascii_letters;
		initialize_digits;
		initialize_hexdigits;
		initialize_octdigits;
		initialize_punctuation;
		initialize_whitespace;
		initialize_printable;
		initialize_capwords;
		initialize_Formatter;
		initialize_Template;
		yourself
%

category: 'Python-Initialization'
method: string
initialize_ascii_lowercase
	"Lowercase letters 'abcdefghijklmnopqrstuvwxyz'"
	self ___at___: #ascii_lowercase put: 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Python-Initialization'
method: string
initialize_ascii_uppercase
	"Uppercase letters 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"
	self ___at___: #ascii_uppercase put: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Python-Initialization'
method: string
initialize_ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	"Use Smalltalk concatenation since these are Smalltalk strings"
	self ___at___: #ascii_letters put: ((self ___at___: #ascii_lowercase) ___concat___: (self ___at___: #ascii_uppercase))
%

category: 'Python-Initialization'
method: string
initialize_digits
	"String containing digits '0123456789'"
	self ___at___: #digits put: '0123456789'
%

category: 'Python-Initialization'
method: string
initialize_hexdigits
	"String containing hexadecimal digits '0123456789abcdefABCDEF'"
	self ___at___: #hexdigits put: '0123456789abcdefABCDEF'
%

category: 'Python-Initialization'
method: string
initialize_octdigits
	"String containing octal digits '01234567'"
	self ___at___: #octdigits put: '01234567'
%

category: 'Python-Initialization'
method: string
initialize_punctuation
	"String of ASCII punctuation characters"
	self ___at___: #punctuation put: '!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~'
%

category: 'Python-Initialization'
method: string
initialize_printable
	"String of printable ASCII characters (digits + letters + punctuation + whitespace)"
	"Use Smalltalk concatenation since these are Smalltalk strings"
	| temp |
	temp := (self ___at___: #digits) ___concat___: (self ___at___: #ascii_letters).
	temp := temp ___concat___: (self ___at___: #punctuation).
	self ___at___: #printable put: (temp ___concat___: (self ___at___: #whitespace))
%

category: 'Python-Initialization'
method: string
initialize_whitespace
	"String of all whitespace characters"
	self ___at___: #whitespace put: ' \t\n\r\x0b\x0c'
%

category: 'Python-Initialization'
method: string
initialize_capwords
	"capwords(s, sep=None) - Split string into words, capitalize first letter of each word, and join"
	self ___at___: #capwords put: [:positional :keywords |
		| s sep words result keywordsDict |
		s := positional ___at___: 1.
		"Convert keywords to Dictionary - handle nil, Dictionary, or array of Associations"
		keywordsDict := (keywords == nil) ifTrue: [
			KeyValueDictionary ___new___
		] ifFalse: [
			| keywordsClass |
			keywordsClass := keywords perform: #class env: 0.
			(keywordsClass == KeyValueDictionary) ifTrue: [
				keywords
			] ifFalse: [
				"Convert array of Associations to Dictionary"
				| dict assoc assocKey assocValue |
				dict := KeyValueDictionary ___new___.
				"Access each Association in the array"
				keywords perform: #do: env: 0 withArguments: {[:assoc |
					assocKey := assoc perform: #key env: 0.
					assocValue := assoc perform: #value env: 0.
					dict perform: #at:put: env: 0 withArguments: {assocKey. assocValue}
				]}.
				dict
			]
		].
		sep := (keywordsDict ___at___: #sep ifAbsent: [
			((positional __len__) ___gt___: 1)
				ifTrue: [positional ___at___: 2]
				ifFalse: [nil]
		]).
		"Split the string - if sep is None, use default whitespace splitting"
		sep == nil ifTrue: [
			words := s split
		] ifFalse: [
			"Split by separator using GemStone's subStrings: method"
			words := s perform: #subStrings: env: 0 withArguments: {sep}
		].
		result := list ___new___.
		words ___do___: [:word |
			| capitalized |
			(word __len__ ___gt___: 0) ifTrue: [
				"Use capitalize() which capitalizes first char and lowercases the rest"
				capitalized := word capitalize.
				result append: capitalized
			] ifFalse: [
				result append: word
			]
		].
		"Join the words back together"
		sep == nil ifTrue: [
			' ' join: result
		] ifFalse: [
			"Convert sep to Python string (str.__new__ handles both str and non-str inputs)"
			| sepStr |
			sepStr := str __new__: sep.
			sepStr join: result
		]
	]
%

category: 'Python-Helpers'
method: string
splitString: aString by: separator
	"Helper method to split a string by a separator, returning a list"
	| parts currentPart sepSize strSize i |
	parts := list ___new___.
	currentPart := str ___new___.
	sepSize := separator ___size___.
	strSize := aString ___size___.
	i := 1.
	
	[i ___le___: strSize] ___whileTrue___: [
		| match |
		match := true.
		
		"Check if separator matches at current position"
		((i ___plus___: (sepSize ___minus___: 1)) ___le___: strSize) ifTrue: [
			1 ___to___: sepSize do: [:j |
				| strChar sepChar strIdx sepIdx |
				strIdx := (i ___plus___: (j ___minus___: 1)) ___minus___: 1.
				sepIdx := j ___minus___: 1.
				strChar := aString __getitem__: strIdx.
				sepChar := separator __getitem__: sepIdx.
				(strChar ___ne___: sepChar) ifTrue: [
					match := false
				]
			]
		] ifFalse: [
			match := false
		].
		
		match ifTrue: [
			"Found separator - add current part to list"
			parts append: currentPart.
			currentPart := str ___new___.
			i := i ___plus___: sepSize
		] ifFalse: [
			"Add character to current part"
			| char charStr |
			char := aString __getitem__: (i ___minus___: 1).
			"Create a single-character string using Smalltalk ___new___: method"
			charStr := str ___new___: 1.
			charStr ___at___: 1 put: char.
			currentPart := currentPart __add__: charStr.
			i := i ___plus___: 1
		]
	].
	
	"Add final part"
	parts append: currentPart.
	^ parts
%

category: 'Python-Initialization'
method: string
initialize_Formatter
	"Formatter class for custom string formatting"
	self ___at___: #Formatter put: string_formatter
%

category: 'Python-Initialization'
method: string
initialize_Template
	"Template class for string templates (stub implementation)"
	"TODO: Implement full Template class"
	self ___at___: #Template put: None
%

category: 'Python-String Constants'
method: string
ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	^ self ___at___: #ascii_letters
%

category: 'Python-String Constants'
method: string
ascii_letters: aValue
	"Set the ascii_letters constant (for monkey patching)"
	self ___at___: #ascii_letters put: aValue
%

category: 'Python-String Constants'
method: string
ascii_lowercase
	"Lowercase letters 'abcdefghijklmnopqrstuvwxyz'"
	^ self ___at___: #ascii_lowercase
%

category: 'Python-String Constants'
method: string
ascii_lowercase: aValue
	"Set the ascii_lowercase constant (for monkey patching)"
	self ___at___: #ascii_lowercase put: aValue
%

category: 'Python-String Constants'
method: string
ascii_uppercase
	"Uppercase letters 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"
	^ self ___at___: #ascii_uppercase
%

category: 'Python-String Constants'
method: string
ascii_uppercase: aValue
	"Set the ascii_uppercase constant (for monkey patching)"
	self ___at___: #ascii_uppercase put: aValue
%

category: 'Python-String Constants'
method: string
digits
	"String containing digits '0123456789'"
	^ self ___at___: #digits
%

category: 'Python-String Constants'
method: string
digits: aValue
	"Set the digits constant (for monkey patching)"
	self ___at___: #digits put: aValue
%

category: 'Python-String Constants'
method: string
hexdigits
	"String containing hexadecimal digits '0123456789abcdefABCDEF'"
	^ self ___at___: #hexdigits
%

category: 'Python-String Constants'
method: string
hexdigits: aValue
	"Set the hexdigits constant (for monkey patching)"
	self ___at___: #hexdigits put: aValue
%

category: 'Python-String Constants'
method: string
octdigits
	"String containing octal digits '01234567'"
	^ self ___at___: #octdigits
%

category: 'Python-String Constants'
method: string
octdigits: aValue
	"Set the octdigits constant (for monkey patching)"
	self ___at___: #octdigits put: aValue
%

category: 'Python-String Constants'
method: string
punctuation
	"String of ASCII punctuation characters"
	^ self ___at___: #punctuation
%

category: 'Python-String Constants'
method: string
punctuation: aValue
	"Set the punctuation constant (for monkey patching)"
	self ___at___: #punctuation put: aValue
%

category: 'Python-String Constants'
method: string
printable
	"String of printable ASCII characters"
	^ self ___at___: #printable
%

category: 'Python-String Constants'
method: string
printable: aValue
	"Set the printable constant (for monkey patching)"
	self ___at___: #printable put: aValue
%

category: 'Python-String Constants'
method: string
whitespace
	"String of all whitespace characters"
	^ self ___at___: #whitespace
%

category: 'Python-String Constants'
method: string
whitespace: aValue
	"Set the whitespace constant (for monkey patching)"
	self ___at___: #whitespace put: aValue
%

category: 'Python-Utility Functions'
method: string
capwords
	"Return the capwords function"
	^ self ___at___: #capwords
%

category: 'Python-Utility Functions'
method: string
capwords: aBlock
	"Set the capwords function (for monkey patching)"
	self ___at___: #capwords put: aBlock
%

category: 'Python-Utility Classes'
method: string
Formatter
	"Return the Formatter class"
	^ self ___at___: #Formatter
%

category: 'Python-Utility Classes'
method: string
Formatter: aValue
	"Set the Formatter class (for monkey patching)"
	self ___at___: #Formatter put: aValue
%

category: 'Python-Utility Classes'
method: string
Template
	"Return the Template class"
	^ self ___at___: #Template
%

category: 'Python-Utility Classes'
method: string
Template: aValue
	"Set the Template class (for monkey patching)"
	self ___at___: #Template put: aValue
%

set compile_env: 0

