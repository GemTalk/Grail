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

Submodule:
- entities: html.entities (name2codepoint, codepoint2name, entitydefs, html5).

See https://docs.python.org/3/library/html.html for documentation.
'
%

expectvalue /Class
doit
html category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from html
expectvalue /Metaclass3
doit
html removeAllMethods: 1.
html class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: html
initialize
	"Bind the html.entities submodule. The `entities` accessor reads
	this slot. This initialize is kept because `entities` is a stored
	attribute (a reference to another module instance), not a callable."

	self @env0:at: #entities put: (html_entities @env1:instance)
%

! ===============================================================================
! Submodule attribute (stored data, not a callable)
! ===============================================================================

category: 'Grail-Accessors'
method: html
entities
	"Return the html.entities submodule (stored attribute, populated by
	`initialize`)."
	^ self @env0:at: #entities
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: html
escape: s
	"Python html.escape(s) — fast path. 1-arg form: replaces
	&, <, >, and quotes (default `quote=True`) with HTML entities."

	^ self escape: s _: true
%

category: 'Grail-Built-in Functions'
method: html
escape: s _: quote
	"Python html.escape(s, quote) — fast path. 2-arg form.
	Replaces &, <, >, and (when quote is truthy) double and single
	quotes with HTML entities. & must be replaced first to avoid
	double-escaping."

	| result |
	result := s @env0:copyReplaceAll: '&' with: '&amp;'.
	result := result @env0:copyReplaceAll: '<' with: '&lt;'.
	result := result @env0:copyReplaceAll: '>' with: '&gt;'.
	quote ___isTruthy___ ifTrue: [
		result := result @env0:copyReplaceAll: '"' with: '&quot;'.
		result := result @env0:copyReplaceAll: '''' with: '&#x27;'.
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: html
unescape: s
	"Python html.unescape(s) — fast path. Converts HTML
	character references (&amp; &#NNN; &#xHHH;) back to characters.
	Quick exit if no `&` in the input string."

	| n2c out i len |
	n2c := (self @env0:at: #entities) @env0:at: #name2codepoint.

	(s @env0:includesString: '&') ifFalse: [^ s].

	out := WriteStream @env0:on: (Unicode7 @env0:new).
	i := 1.
	len := s @env0:size.
	[i @env0:<= len] @env0:whileTrue: [
		| ch |
		ch := s @env0:at: i.
		(ch == $&) ifTrue: [
			| j semiPos ref replacement |
			"Find the closing semicolon (max 32 chars ahead)"
			semiPos := 0.
			j := i @env0:+ 1.
			[((j @env0:<= len) and: [(j @env0:- i) @env0:< 32])] @env0:whileTrue: [
				((s @env0:at: j) == $;) ifTrue: [
					semiPos := j.
					j := len @env0:+ 1.  "break"
				] ifFalse: [
					j := j @env0:+ 1.
				].
			].
			(semiPos @env0:> 0) ifTrue: [
				ref := s @env0:copyFrom: (i @env0:+ 1) to: (semiPos @env0:- 1).
				replacement := nil.
				"Numeric reference: &#NNN; or &#xHHH;"
				((ref @env0:at: 1) == $#) ifTrue: [
					| numStr codepoint |
					numStr := ref @env0:copyFrom: 2 to: (ref @env0:size).
					[
						(((numStr @env0:at: 1) == $x) or:
						 [((numStr @env0:at: 1) == $X)]) ifTrue: [
							"Hex: &#xHHH; - prepend 16r for Smalltalk hex literal parsing"
							| hexDigits |
							hexDigits := numStr @env0:copyFrom: 2 to: (numStr @env0:size).
							codepoint := ('16r' @env0:, hexDigits) @env0:asInteger.
						] ifFalse: [
							"Decimal: &#NNN;"
							codepoint := numStr @env0:asInteger.
						].
						replacement := Character @env0:codePoint: codepoint.
						replacement := replacement @env0:asString.
					] @env0:on: Error do: [:ex | replacement := nil].
				] ifFalse: [
					"Named reference: &name; — look up codepoint and convert"
					| cp |
					cp := n2c @env0:at: ref ifAbsent: [nil].
					(cp == nil) ifFalse: [
						replacement := (Character @env0:codePoint: cp) @env0:asString.
					].
				].
				(replacement == nil) ifFalse: [
					out @env0:nextPutAll: replacement.
					i := semiPos @env0:+ 1.
				] ifTrue: [
					out @env0:nextPut: $&.
					i := i @env0:+ 1.
				].
			] ifFalse: [
				out @env0:nextPut: $&.
				i := i @env0:+ 1.
			].
		] ifFalse: [
			out @env0:nextPut: ch.
			i := i @env0:+ 1.
		].
	].
	^ out @env0:contents
%

set compile_env: 0
