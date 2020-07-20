! ------------------- Remove existing behavior from AliasAst
expectvalue /Metaclass3       
doit
AliasAst removeAllMethods.
AliasAst class removeAllMethods.
%
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
set compile_env: 0
category: 'other'
method: AliasAst
_asName
	^ asName
%
category: 'other'
method: AliasAst
_name
	^ name
%
category: 'other'
method: AliasAst
import

	| function keywords |
	function := (self associationAt: #'__import__') value.
	keywords := SymbolDictionary new
		at: #'globals' 	put: self globals;
		at: #'locals'	put: self locals;
		at: #'fromlist'	put: #();
		at: #'level'		put: 0;
		yourself.
	assoc value: (function value: (Array with: name) value: keywords).
%
category: 'other'
method: AliasAst
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string asSymbol.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := (stream upTo: $') asSymbol.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
		asName := nil.
	].
%
category: 'other'
method: AliasAst
initialize2

	| symbol |
	super initialize2.
	symbol := asName ifNil: [name].
	assoc := self associationAt: symbol.
%
category: 'other'
method: AliasAst
name

	^name
%
