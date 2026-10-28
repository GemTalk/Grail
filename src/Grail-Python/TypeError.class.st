Class {
	#name : 'TypeError',
	#superclass : 'Exception',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___grailCheckMultipleValues___: names pos: positional kw: keywords skip: skip name: qualname [
	"CPython's ``got multiple values for argument'' check for one call (#1477):
	names holds the call site's positional-OR-keyword parameters in order,
	the first of them at positional index skip + 1, and one bound positionally
	must not also arrive in keywords.  Signals for the first such name, in
	parameter order; answers nil otherwise.

	A METHOD rather than code emitted at each def, for two reasons.  A def
	can declare hundreds of parameters -- test_call's TestFunctionWithManyArgs
	builds one with 1000 -- and a check per parameter made such a method too
	large to run.  And an emitted LOOP would be a block reading the
	positional Array and the keyword dict, which on the IR arm moves both
	into a context the def's other blocks share: a generator's body then
	kept every argument alive for the generator's life
	(test_contextlib's test_nokeepref).  Passed here as arguments, they are
	captured by nothing.  Called only when the call passed keywords."

	| n param |
	n := (positional size - skip) min: names size.
	1 to: n do: [:i |
		param := names at: i.
		(keywords includesKey: param) ifTrue: [
			^ self @env1:___signal___: qualname , '() got multiple values for argument ''' , param , '''']].
	^ nil

]

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___refuseKeywordsIn___: keywords for: aFunctionName [
	"The refusal of a built-in that takes no keyword at all, whatever its name:
	CPython's vectorcall for a METH_FASTCALL function without METH_KEYWORDS
	(Objects/methodobject.c:407-419, cfunction_check_kwargs)."

	(keywords isNil or: [keywords isEmpty]) ifTrue: [^ self].
	^ self @env1:___signal___: aFunctionName , '() takes no keyword arguments'

]

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___refuseKeywordsIn___: keywords otherThan: acceptedNames for: aFunctionName [
	"The refusal of a keyword the built-in's signature does not name, by its
	name: Python/getargs.c:1492-1540, error_unexpected_keyword_arg.  The varargs
	entries read the keywords they know, and every other keyword used to be
	DROPPED -- ``sum([], x=1)'' answered 0 and ``print(x=1)'' printed an empty
	line -- so a misspelt keyword was a silently ignored argument."

	(keywords isNil or: [keywords isEmpty]) ifTrue: [^ self].
	keywords keysDo: [:each |
		(acceptedNames includes: each asString) ifFalse: [
			^ self @env1:___signal___: aFunctionName
				, '() got an unexpected keyword argument ''' , each asString , '''']].
	^ self

]
