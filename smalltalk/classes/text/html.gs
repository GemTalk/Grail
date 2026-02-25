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
		result := s
			perform: #copyReplaceAll:with: env: 0
			withArguments: { '&'. '&amp;' }.
		result := result
			perform: #copyReplaceAll:with: env: 0
			withArguments: { '<'. '&lt;' }.
		result := result
			perform: #copyReplaceAll:with: env: 0
			withArguments: { '>'. '&gt;' }.
		quote ___isTruthy___ ifTrue: [
			result := result
				perform: #copyReplaceAll:with: env: 0
				withArguments: { '"'. '&quot;' }.
			result := result
				perform: #copyReplaceAll:with: env: 0
				withArguments: { ''''. '&#x27;' }.
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
		(s perform: #includesString: env: 0 withArguments: { '&' })
			ifFalse: [s]
			ifTrue: [
				| out i len |
				out := WriteStream perform: #on: env: 0 withArguments: { Unicode7 perform: #new env: 0 }.
				i := 1.
				len := s perform: #size env: 0.
				[i ___le___: len] ___whileTrue___: [
					| ch |
					ch := s perform: #at: env: 0 withArguments: { i }.
					(ch ___eq___: $&) ifTrue: [
						| j semiPos ref replacement |
						"Find the closing semicolon (max 32 chars ahead)"
						semiPos := 0.
						j := i ___plus___: 1.
						[((j ___le___: len) and: [(j ___minus___: i) ___lt___: 32])] ___whileTrue___: [
							((s perform: #at: env: 0 withArguments: { j }) ___eq___: $;) ifTrue: [
								semiPos := j.
								j := len ___plus___: 1.  "break"
							] ifFalse: [
								j := j ___plus___: 1.
							].
						].
						(semiPos ___gt___: 0) ifTrue: [
							ref := s perform: #copyFrom:to: env: 0 withArguments: { (i ___plus___: 1). (semiPos ___minus___: 1) }.
							replacement := nil.
							"Numeric reference: &#NNN; or &#xHHH;"
							((ref perform: #at: env: 0 withArguments: { 1 }) ___eq___: $#) ifTrue: [
								| numStr codepoint |
								numStr := ref perform: #copyFrom:to: env: 0 withArguments: { 2. ref perform: #size env: 0 }.
								[
									(((numStr perform: #at: env: 0 withArguments: { 1 }) ___eq___: $x) or:
									 [((numStr perform: #at: env: 0 withArguments: { 1 }) ___eq___: $X)]) ifTrue: [
										"Hex: &#xHHH; - prepend 16r for Smalltalk hex literal parsing"
										| hexDigits |
										hexDigits := numStr perform: #copyFrom:to: env: 0 withArguments: { 2. numStr perform: #size env: 0 }.
										codepoint := ('16r' perform: #, env: 0 withArguments: { hexDigits })
											perform: #asInteger env: 0.
									] ifFalse: [
										"Decimal: &#NNN;"
										codepoint := numStr perform: #asInteger env: 0.
									].
									replacement := Character perform: #codePoint: env: 0 withArguments: { codepoint }.
									replacement := replacement ___asString___.
								] ___on___: Error do: [:ex | replacement := nil].
							] ifFalse: [
								"Named reference: &name; — look up codepoint and convert"
								| cp |
								cp := n2c perform: #at:ifAbsent: env: 0 withArguments: { ref. [nil] }.
								(cp ___eq___: nil) ifFalse: [
									replacement := (Character perform: #codePoint: env: 0 withArguments: { cp }) ___asString___.
								].
							].
							(replacement ___eq___: nil) ifFalse: [
								out perform: #nextPutAll: env: 0 withArguments: { replacement }.
								i := semiPos ___plus___: 1.
							] ifTrue: [
								out perform: #nextPut: env: 0 withArguments: { $& }.
								i := i ___plus___: 1.
							].
						] ifFalse: [
							out perform: #nextPut: env: 0 withArguments: { $& }.
							i := i ___plus___: 1.
						].
					] ifFalse: [
						out perform: #nextPut: env: 0 withArguments: { ch }.
						i := i ___plus___: 1.
					].
				].
				out perform: #contents env: 0
			]
	]
%

category: 'Python-Initialization'
method: html
initialize_entities_module
	"Bind the html.entities submodule."
	self ___at___: #entities put: (html_entities perform: #instance env: 1)
%

set compile_env: 0
