! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- string class (Python 'string' module)
expectvalue /Class
doit
module subclass: 'string'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
string comment:
'Python string module.

String constants:
- ascii_letters, ascii_lowercase, ascii_uppercase
- digits, hexdigits, octdigits
- punctuation, printable, whitespace

Utility functions:
- capwords(s, sep=None): Split, capitalize, and join.
- Formatter: Class for custom string formatting.
- Template: Class for string templates (stub).

See https://docs.python.org/3/library/string.html for documentation.
'
%

expectvalue /Class
doit
string category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from string
expectvalue /Metaclass3
doit
string removeAllMethods: 1.
string class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: string
initialize
	"Initialize all stored-attribute constants."
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
		initialize_Formatter;
		initialize_Template;
		yourself
%

category: 'Grail-Initialization'
method: string
initialize_ascii_lowercase
	self @env0:at: #ascii_lowercase put: 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Grail-Initialization'
method: string
initialize_ascii_uppercase
	self @env0:at: #ascii_uppercase put: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Grail-Initialization'
method: string
initialize_ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	self @env0:at: #ascii_letters put: ((self @env0:at: #ascii_lowercase) @env0:, (self @env0:at: #ascii_uppercase))
%

category: 'Grail-Initialization'
method: string
initialize_digits
	self @env0:at: #digits put: '0123456789'
%

category: 'Grail-Initialization'
method: string
initialize_hexdigits
	self @env0:at: #hexdigits put: '0123456789abcdefABCDEF'
%

category: 'Grail-Initialization'
method: string
initialize_octdigits
	self @env0:at: #octdigits put: '01234567'
%

category: 'Grail-Initialization'
method: string
initialize_punctuation
	self @env0:at: #punctuation put: '!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~'
%

category: 'Grail-Initialization'
method: string
initialize_whitespace
	self @env0:at: #whitespace put: ' \t\n\r\x0b\x0c'
%

category: 'Grail-Initialization'
method: string
initialize_printable
	| temp |
	temp := (self @env0:at: #digits) @env0:, (self @env0:at: #ascii_letters).
	temp := temp @env0:, (self @env0:at: #punctuation).
	self @env0:at: #printable put: (temp @env0:, (self @env0:at: #whitespace))
%

category: 'Grail-Initialization'
method: string
initialize_Formatter
	self @env0:at: #Formatter put: string_formatter
%

category: 'Grail-Initialization'
method: string
initialize_Template
	self @env0:at: #Template put: None
%

! ===============================================================================
! Stored-attribute accessors (not callables)
! ===============================================================================

category: 'Grail-String Constants'
method: string
ascii_letters
	^ self @env0:at: #ascii_letters
%

category: 'Grail-String Constants'
method: string
ascii_lowercase
	^ self @env0:at: #ascii_lowercase
%

category: 'Grail-String Constants'
method: string
ascii_uppercase
	^ self @env0:at: #ascii_uppercase
%

category: 'Grail-String Constants'
method: string
digits
	^ self @env0:at: #digits
%

category: 'Grail-String Constants'
method: string
hexdigits
	^ self @env0:at: #hexdigits
%

category: 'Grail-String Constants'
method: string
octdigits
	^ self @env0:at: #octdigits
%

category: 'Grail-String Constants'
method: string
printable
	^ self @env0:at: #printable
%

category: 'Grail-String Constants'
method: string
punctuation
	^ self @env0:at: #punctuation
%

category: 'Grail-String Constants'
method: string
whitespace
	^ self @env0:at: #whitespace
%

category: 'Grail-Utility Classes'
method: string
Formatter
	^ self @env0:at: #Formatter
%

category: 'Grail-Utility Classes'
method: string
Template
	^ self @env0:at: #Template
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

category: 'Grail-Utility Functions'
method: string
capwords: s
	"Python string.capwords(s) — fast path, 1-arg form.
	Delegates to the varargs form with nil sep."

	^ self _capwords: { s } kw: nil
%

category: 'Grail-Utility Functions'
method: string
_capwords: positional kw: kwargs
	"Python string.capwords(s, sep=None) — varargs fast path.
	Split string into words, capitalize first letter of each word, join."

	| s sep words result keywordsDict |
	s := positional @env0:at: 1.
	keywordsDict := (kwargs == nil) ifTrue: [
		KeyValueDictionary ___new___
	] ifFalse: [
		| keywordsClass |
		keywordsClass := kwargs @env0:class.
		(keywordsClass == KeyValueDictionary) ifTrue: [
			kwargs
		] ifFalse: [
			| dict |
			dict := KeyValueDictionary ___new___.
			kwargs @env0:do: [:assoc |
				dict @env0:at: (assoc @env0:key) put: (assoc @env0:value)
			].
			dict
		]
	].
	sep := (keywordsDict @env0:at: #sep ifAbsent: [
		((positional __len__) @env0:> 1)
			ifTrue: [positional @env0:at: 2]
			ifFalse: [nil]
	]).
	sep == nil ifTrue: [
		words := s split
	] ifFalse: [
		words := s @env0:subStrings: sep
	].
	result := list ___new___.
	words @env0:do: [:word |
		| capitalized |
		(word __len__ @env0:> 0) ifTrue: [
			capitalized := word capitalize.
			result append: capitalized
		] ifFalse: [
			result append: word
		]
	].
	sep == nil ifTrue: [
		^ ' ' join: result
	] ifFalse: [
		| sepStr |
		sepStr := str __new__: sep.
		^ sepStr join: result
	]
%

! ===============================================================================
! Helper methods (Smalltalk-side, not Python callables)
! ===============================================================================

category: 'Grail-Helpers'
method: string
splitString: aString by: separator
	"Helper method to split a string by a separator, returning a list"
	| parts currentPart sepSize strSize i |
	parts := list ___new___.
	currentPart := str ___new___.
	sepSize := separator @env0:size.
	strSize := aString @env0:size.
	i := 1.

	[i @env0:<= strSize] @env0:whileTrue: [
		| match |
		match := true.

		"Check if separator matches at current position"
		((i @env0:+ (sepSize @env0:- 1)) @env0:<= strSize) ifTrue: [
			1 @env0:to: sepSize do: [:j |
				| strChar sepChar strIdx sepIdx |
				strIdx := (i @env0:+ (j @env0:- 1)) @env0:- 1.
				sepIdx := j @env0:- 1.
				strChar := aString __getitem__: strIdx.
				sepChar := separator __getitem__: sepIdx.
				(strChar @env0:~= sepChar) ifTrue: [
					match := false
				]
			]
		] ifFalse: [
			match := false
		].

		match ifTrue: [
			parts append: currentPart.
			currentPart := str ___new___.
			i := i @env0:+ sepSize
		] ifFalse: [
			| char charStr |
			char := aString __getitem__: (i @env0:- 1).
			charStr := str ___new___: 1.
			charStr @env0:at: 1 put: char.
			currentPart := currentPart __add__: charStr.
			i := i @env0:+ 1
		]
	].

	parts append: currentPart.
	^ parts
%

set compile_env: 0
