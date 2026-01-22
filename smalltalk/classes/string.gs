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

! ------------------- Class methods for string

category: 'Python-Singleton'
classmethod: string
new
	"Raise an error: use instance instead of new"
	TypeError ___signal___: 'Use instance instead of new for string module'
%

category: 'Python-Singleton'
classmethod: string
instance
	"Return the singleton instance of string.
	Creates it if it doesn't exist."
	instance == nil ifTrue: [
		instance := self perform: #basicNew env: 0.
		instance initialize
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: string
clearInstance
	"Clear the singleton instance (useful for testing)"
	instance := nil
%

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
	ascii_lowercase := 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Python-Initialization'
method: string
initialize_ascii_uppercase
	"Uppercase letters 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"
	ascii_uppercase := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Python-Initialization'
method: string
initialize_ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	"Use Smalltalk concatenation since these are Smalltalk strings"
	ascii_letters := ascii_lowercase ___concat___: ascii_uppercase
%

category: 'Python-Initialization'
method: string
initialize_digits
	"String containing digits '0123456789'"
	digits := '0123456789'
%

category: 'Python-Initialization'
method: string
initialize_hexdigits
	"String containing hexadecimal digits '0123456789abcdefABCDEF'"
	hexdigits := '0123456789abcdefABCDEF'
%

category: 'Python-Initialization'
method: string
initialize_octdigits
	"String containing octal digits '01234567'"
	octdigits := '01234567'
%

category: 'Python-Initialization'
method: string
initialize_punctuation
	"String of ASCII punctuation characters"
	punctuation := '!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~'
%

category: 'Python-Initialization'
method: string
initialize_printable
	"String of printable ASCII characters (digits + letters + punctuation + whitespace)"
	"Use Smalltalk concatenation since these are Smalltalk strings"
	| temp |
	temp := digits ___concat___: ascii_letters.
	temp := temp ___concat___: punctuation.
	printable := temp ___concat___: whitespace
%

category: 'Python-Initialization'
method: string
initialize_whitespace
	"String of all whitespace characters"
	whitespace := ' \t\n\r\x0b\x0c'
%

category: 'Python-Initialization'
method: string
initialize_capwords
	"capwords(s, sep=None) - Split string into words, capitalize first letter of each word, and join"
	capwords := [:positional :keywords |
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
	Formatter := string_formatter
%

category: 'Python-Initialization'
method: string
initialize_Template
	"Template class for string templates (stub implementation)"
	"TODO: Implement full Template class"
	Template := None
%

category: 'Python-String Constants'
method: string
ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	^ ascii_letters
%

category: 'Python-String Constants'
method: string
ascii_letters: aValue
	"Set the ascii_letters constant (for monkey patching)"
	ascii_letters := aValue
%

category: 'Python-String Constants'
method: string
ascii_lowercase
	"Lowercase letters 'abcdefghijklmnopqrstuvwxyz'"
	^ ascii_lowercase
%

category: 'Python-String Constants'
method: string
ascii_lowercase: aValue
	"Set the ascii_lowercase constant (for monkey patching)"
	ascii_lowercase := aValue
%

category: 'Python-String Constants'
method: string
ascii_uppercase
	"Uppercase letters 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"
	^ ascii_uppercase
%

category: 'Python-String Constants'
method: string
ascii_uppercase: aValue
	"Set the ascii_uppercase constant (for monkey patching)"
	ascii_uppercase := aValue
%

category: 'Python-String Constants'
method: string
digits
	"String containing digits '0123456789'"
	^ digits
%

category: 'Python-String Constants'
method: string
digits: aValue
	"Set the digits constant (for monkey patching)"
	digits := aValue
%

category: 'Python-String Constants'
method: string
hexdigits
	"String containing hexadecimal digits '0123456789abcdefABCDEF'"
	^ hexdigits
%

category: 'Python-String Constants'
method: string
hexdigits: aValue
	"Set the hexdigits constant (for monkey patching)"
	hexdigits := aValue
%

category: 'Python-String Constants'
method: string
octdigits
	"String containing octal digits '01234567'"
	^ octdigits
%

category: 'Python-String Constants'
method: string
octdigits: aValue
	"Set the octdigits constant (for monkey patching)"
	octdigits := aValue
%

category: 'Python-String Constants'
method: string
punctuation
	"String of ASCII punctuation characters"
	^ punctuation
%

category: 'Python-String Constants'
method: string
punctuation: aValue
	"Set the punctuation constant (for monkey patching)"
	punctuation := aValue
%

category: 'Python-String Constants'
method: string
printable
	"String of printable ASCII characters"
	^ printable
%

category: 'Python-String Constants'
method: string
printable: aValue
	"Set the printable constant (for monkey patching)"
	printable := aValue
%

category: 'Python-String Constants'
method: string
whitespace
	"String of all whitespace characters"
	^ whitespace
%

category: 'Python-String Constants'
method: string
whitespace: aValue
	"Set the whitespace constant (for monkey patching)"
	whitespace := aValue
%

category: 'Python-Utility Functions'
method: string
capwords
	"Return the capwords function"
	^ capwords
%

category: 'Python-Utility Functions'
method: string
capwords: aBlock
	"Set the capwords function (for monkey patching)"
	capwords := aBlock
%

category: 'Python-Utility Classes'
method: string
Formatter
	"Return the Formatter class"
	^ Formatter
%

category: 'Python-Utility Classes'
method: string
Formatter: aValue
	"Set the Formatter class (for monkey patching)"
	Formatter := aValue
%

category: 'Python-Utility Classes'
method: string
Template
	"Return the Template class"
	^ Template
%

category: 'Python-Utility Classes'
method: string
Template: aValue
	"Set the Template class (for monkey patching)"
	Template := aValue
%

set compile_env: 0

