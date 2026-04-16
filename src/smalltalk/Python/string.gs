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
string category: 'Modules'
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

category: 'Python-Initialization'
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

category: 'Python-Initialization'
method: string
initialize_ascii_lowercase
	self ___at___: #ascii_lowercase put: 'abcdefghijklmnopqrstuvwxyz'
%

category: 'Python-Initialization'
method: string
initialize_ascii_uppercase
	self ___at___: #ascii_uppercase put: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
%

category: 'Python-Initialization'
method: string
initialize_ascii_letters
	"Concatenation of ascii_lowercase and ascii_uppercase"
	self ___at___: #ascii_letters put: ((self ___at___: #ascii_lowercase) ___concat___: (self ___at___: #ascii_uppercase))
%

category: 'Python-Initialization'
method: string
initialize_digits
	self ___at___: #digits put: '0123456789'
%

category: 'Python-Initialization'
method: string
initialize_hexdigits
	self ___at___: #hexdigits put: '0123456789abcdefABCDEF'
%

category: 'Python-Initialization'
method: string
initialize_octdigits
	self ___at___: #octdigits put: '01234567'
%

category: 'Python-Initialization'
method: string
initialize_punctuation
	self ___at___: #punctuation put: '!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~'
%

category: 'Python-Initialization'
method: string
initialize_whitespace
	self ___at___: #whitespace put: ' \t\n\r\x0b\x0c'
%

category: 'Python-Initialization'
method: string
initialize_printable
	| temp |
	temp := (self ___at___: #digits) ___concat___: (self ___at___: #ascii_letters).
	temp := temp ___concat___: (self ___at___: #punctuation).
	self ___at___: #printable put: (temp ___concat___: (self ___at___: #whitespace))
%

category: 'Python-Initialization'
method: string
initialize_Formatter
	self ___at___: #Formatter put: string_formatter
%

category: 'Python-Initialization'
method: string
initialize_Template
	self ___at___: #Template put: None
%

! ===============================================================================
! Stored-attribute accessors (not callables)
! ===============================================================================

category: 'Python-String Constants'
method: string
ascii_letters
	^ self ___at___: #ascii_letters
%

category: 'Python-String Constants'
method: string
ascii_lowercase
	^ self ___at___: #ascii_lowercase
%

category: 'Python-String Constants'
method: string
ascii_uppercase
	^ self ___at___: #ascii_uppercase
%

category: 'Python-String Constants'
method: string
digits
	^ self ___at___: #digits
%

category: 'Python-String Constants'
method: string
hexdigits
	^ self ___at___: #hexdigits
%

category: 'Python-String Constants'
method: string
octdigits
	^ self ___at___: #octdigits
%

category: 'Python-String Constants'
method: string
printable
	^ self ___at___: #printable
%

category: 'Python-String Constants'
method: string
punctuation
	^ self ___at___: #punctuation
%

category: 'Python-String Constants'
method: string
whitespace
	^ self ___at___: #whitespace
%

category: 'Python-Utility Classes'
method: string
Formatter
	^ self ___at___: #Formatter
%

category: 'Python-Utility Classes'
method: string
Template
	^ self ___at___: #Template
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

category: 'Python-Utility Functions'
method: string
capwords: s
	"Python string.capwords(s) — fast path, 1-arg form.
	Delegates to the varargs form with nil sep."

	^ self _capwords: { s } kw: nil
%

category: 'Python-Utility Functions'
method: string
_capwords: positional kw: kwargs
	"Python string.capwords(s, sep=None) — varargs fast path.
	Split string into words, capitalize first letter of each word, join."

	| s sep words result keywordsDict |
	s := positional ___at___: 1.
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
	sep := (keywordsDict ___at___: #sep ifAbsent: [
		((positional __len__) ___gt___: 1)
			ifTrue: [positional ___at___: 2]
			ifFalse: [nil]
	]).
	sep == nil ifTrue: [
		words := s split
	] ifFalse: [
		words := s @env0:subStrings: sep
	].
	result := list ___new___.
	words ___do___: [:word |
		| capitalized |
		(word __len__ ___gt___: 0) ifTrue: [
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
			parts append: currentPart.
			currentPart := str ___new___.
			i := i ___plus___: sepSize
		] ifFalse: [
			| char charStr |
			char := aString __getitem__: (i ___minus___: 1).
			charStr := str ___new___: 1.
			charStr ___at___: 1 put: char.
			currentPart := currentPart __add__: charStr.
			i := i ___plus___: 1
		]
	].

	parts append: currentPart.
	^ parts
%

set compile_env: 0
