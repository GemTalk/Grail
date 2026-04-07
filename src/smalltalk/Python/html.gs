! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- html class (Python 'html' module)
expectvalue /Class
doit
module subclass: 'html'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
html comment:
'Python html module.

Provides functions for manipulating HTML.

Functions:
- escape(s, quote=True): Replace special characters with HTML entities.
- unescape(s): Convert HTML entities back to characters.

See https://docs.python.org/3/library/html.html for documentation.
'
%

expectvalue /Class
doit
html category: 'Modules'
%

! ------------------- Remove existing Python methods from html
expectvalue /Metaclass3
doit
html removeAllMethods: 1.
html class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Accessors'
method: html
escape
	^ self ___at___: #escape
%

category: 'Python-Accessors'
method: html
unescape
	^ self ___at___: #unescape
%

category: 'Python-Accessors'
method: html
entities
	^ self ___at___: #entities
%

category: 'Python-Initialization'
method: html
initialize
	self
		initialize_entities_module;
		initialize_escape;
		initialize_unescape;
		yourself
%

category: 'Python-Initialization'
method: html
initialize_escape
	"escape(s, quote=True) -> str
	Replace special characters &, <, >, and optionally quotes with HTML entities."

	self ___at___: #escape put: [:positional :keywords |
		| s quote result |
		s := positional ___at___: 1.
		quote := (positional __len__ ___gt___: 1)
			ifTrue: [positional ___at___: 2]
			ifFalse: [true].

		"& must be replaced first to avoid double-escaping"
		result := s @env0:copyReplaceAll: '&' with: '&amp;'.
		result := result @env0:copyReplaceAll: '<' with: '&lt;'.
		result := result @env0:copyReplaceAll: '>' with: '&gt;'.
		quote ___isTruthy___ ifTrue: [
			result := result @env0:copyReplaceAll: '"' with: '&quot;'.
			result := result @env0:copyReplaceAll: '''' with: '&#x27;'.
		].
		result
	]
%

category: 'Python-Initialization'
method: html
initialize_unescape
	"unescape(s) -> str
	Convert HTML character references (&amp; &#NNN; &#xHHH;) back to characters."

	self ___at___: #unescape put: [:positional :keywords |
		| s n2c |
		s := positional ___at___: 1.
		n2c := (self ___at___: #entities) ___at___: #name2codepoint.

		"Quick exit if no & in string"
		(s @env0:includesString: '&')
			ifFalse: [s]
			ifTrue: [
				| out i len |
				out := WriteStream @env0:on: (Unicode7 @env0:new).
				i := 1.
				len := s @env0:size.
				[i ___le___: len] ___whileTrue___: [
					| ch |
					ch := s @env0:at: i.
					(ch ___eq___: $&) ifTrue: [
						| j semiPos ref replacement |
						"Find the closing semicolon (max 32 chars ahead)"
						semiPos := 0.
						j := i ___plus___: 1.
						[((j ___le___: len) and: [(j ___minus___: i) ___lt___: 32])] ___whileTrue___: [
							((s @env0:at: j) ___eq___: $;) ifTrue: [
								semiPos := j.
								j := len ___plus___: 1.  "break"
							] ifFalse: [
								j := j ___plus___: 1.
							].
						].
						(semiPos ___gt___: 0) ifTrue: [
							ref := s @env0:copyFrom: (i ___plus___: 1) to: (semiPos ___minus___: 1).
							replacement := nil.
							"Numeric reference: &#NNN; or &#xHHH;"
							((ref @env0:at: 1) ___eq___: $#) ifTrue: [
								| numStr codepoint |
								numStr := ref @env0:copyFrom: 2 to: (ref @env0:size).
								[
									(((numStr @env0:at: 1) ___eq___: $x) or:
									 [((numStr @env0:at: 1) ___eq___: $X)]) ifTrue: [
										"Hex: &#xHHH; - prepend 16r for Smalltalk hex literal parsing"
										| hexDigits |
										hexDigits := numStr @env0:copyFrom: 2 to: (numStr @env0:size).
										codepoint := ('16r' @env0:, hexDigits) @env0:asInteger.
									] ifFalse: [
										"Decimal: &#NNN;"
										codepoint := numStr @env0:asInteger.
									].
									replacement := Character @env0:codePoint: codepoint.
									replacement := replacement ___asString___.
								] ___on___: Error do: [:ex | replacement := nil].
							] ifFalse: [
								"Named reference: &name; — look up codepoint and convert"
								| cp |
								cp := n2c @env0:at: ref ifAbsent: [nil].
								(cp ___eq___: nil) ifFalse: [
									replacement := (Character @env0:codePoint: cp) ___asString___.
								].
							].
							(replacement ___eq___: nil) ifFalse: [
								out @env0:nextPutAll: replacement.
								i := semiPos ___plus___: 1.
							] ifTrue: [
								out @env0:nextPut: $&.
								i := i ___plus___: 1.
							].
						] ifFalse: [
							out @env0:nextPut: $&.
							i := i ___plus___: 1.
						].
					] ifFalse: [
						out @env0:nextPut: ch.
						i := i ___plus___: 1.
					].
				].
				out @env0:contents
			]
	]
%

category: 'Python-Initialization'
method: html
initialize_entities_module
	"Bind the html.entities submodule."
	self ___at___: #entities put: (html_entities @env1:instance)
%

set compile_env: 0
