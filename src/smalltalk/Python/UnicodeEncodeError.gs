! ------------------- Superclass check
run
UnicodeError ifNil: [self error: 'UnicodeError is not defined. Check file ordering.'].
%

! ------- UnicodeEncodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeEncodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeEncodeError category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-Python Protocol'
method: UnicodeEncodeError
__str__
	"CPython's wording for the encode side -- see UnicodeDecodeError's.
	The offending CHARACTER is shown as its Python escape, which is
	\\xNN / \\uNNNN / \\UNNNNNNNN by magnitude, and a span of more than
	one is given as a range with no character quoted."

	| enc obj st en why ws |
	enc := self encoding. obj := self object.
	st := self start. en := self end. why := self reason.
	(enc == nil or: [obj == nil or: [st == nil or: [en == nil or: [why == nil]]]])
		ifTrue: [^ super __str__].
	ws := WriteStream @env0:on: String @env0:new.
	ws @env0:nextPut: $'; @env0:nextPutAll: enc @env0:asString;
		@env0:nextPutAll: ''' codec can''t encode '.
	((en @env0:- st) @env0:= 1 and: [st @env0:< (obj @env0:size)])
		ifTrue: [
			ws @env0:nextPutAll: 'character ''';
				@env0:nextPutAll: (self ___escapeForMessage___:
					(self ___codePointAt___: st in: obj));
				@env0:nextPutAll: ''' in position ';
				@env0:nextPutAll: st @env0:printString]
		ifFalse: [
			ws @env0:nextPutAll: 'characters in position ';
				@env0:nextPutAll: st @env0:printString;
				@env0:nextPut: $-;
				@env0:nextPutAll: (en @env0:- 1) @env0:printString].
	ws @env0:nextPutAll: ': '; @env0:nextPutAll: why @env0:asString.
	^ ws @env0:contents
%

set compile_env: 0
