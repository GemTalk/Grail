Class {
	#name : 'TypeError',
	#superclass : 'Exception',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___argumentsOf___: positional keywords: keywords named: parameterNames positionalOnly: aPositionalOnlyCount required: aRequiredCount for: aFunctionName [
	"A built-in's arguments bound to its parameters, by position and then by
	name, and refused as Argument Clinic refuses them and in its order
	(Python/getargs.c:2376-2541, _PyArg_UnpackKeywords): too many in all, too
	few positionally, a required one missing, one given both ways, and last a
	keyword that names no parameter after the positional-only ones.  Answers
	one value per parameter, nil where the call supplied none.

	For a signature with no keyword-only parameter, which is property()'s,
	int()'s and mappingproxy()'s."

	| values unconsumed |
	self ___checkCountOf___: positional keywords: keywords named: parameterNames
		positionalOnly: aPositionalOnlyCount required: aRequiredCount for: aFunctionName.
	values := Array new: parameterNames size.
	positional doWithIndex: [:each :index | values at: index put: each].
	unconsumed := self ___bind___: keywords into: values named: parameterNames
		from: (positional size max: aPositionalOnlyCount) + 1
		required: aRequiredCount for: aFunctionName.
	unconsumed > 0 ifTrue: [
		self ___refuseUnboundKeywordsIn___: keywords given: positional size named: parameterNames
			positionalOnly: aPositionalOnlyCount for: aFunctionName].
	^ values

]

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___bind___: keywords into: values named: parameterNames from: aFirstIndex required: aRequiredCount for: aFunctionName [
	"Fill the parameters from aFirstIndex on by name, refusing a required one
	no keyword supplies.  Once every keyword is consumed only the required
	parameters are still looked at.  Answers how many keywords were left
	unconsumed."

	| unconsumed |
	unconsumed := keywords isNil ifTrue: [0] ifFalse: [keywords size].
	aFirstIndex to: parameterNames size do: [:index |
		(unconsumed = 0 and: [index > aRequiredCount]) ifTrue: [^ 0].
		(unconsumed > 0 and: [keywords includesKey: (parameterNames at: index)])
			ifTrue: [
				values at: index put: (keywords at: (parameterNames at: index)).
				unconsumed := unconsumed - 1]
			ifFalse: [
				index <= aRequiredCount ifTrue: [
					^ self @env1:___signal___: aFunctionName , '() missing required argument '''
						, (parameterNames at: index) , ''' (pos ' , index printString , ')']]].
	^ unconsumed

]

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___checkCountOf___: positional keywords: keywords named: parameterNames positionalOnly: aPositionalOnlyCount required: aRequiredCount for: aFunctionName [
	"Too many arguments in all -- counted with the keywords, and said to be
	keyword arguments when every one was (bpo-31229) -- or too few given
	positionally for the positional-only parameters that are required."

	| given minimum |
	given := positional size + (keywords isNil ifTrue: [0] ifFalse: [keywords size]).
	given > parameterNames size ifTrue: [
		^ self @env1:___signal___: aFunctionName , '() takes at most '
			, parameterNames size printString , ' '
			, (positional isEmpty ifTrue: ['keyword '] ifFalse: [''])
			, (parameterNames size = 1 ifTrue: ['argument'] ifFalse: ['arguments'])
			, ' (' , given printString , ' given)'].
	minimum := aPositionalOnlyCount min: aRequiredCount.
	positional size < minimum ifTrue: [
		^ self @env1:___signal___: aFunctionName , '() takes '
			, (minimum < parameterNames size ifTrue: ['at least'] ifFalse: ['exactly'])
			, ' ' , minimum printString
			, (minimum = 1 ifTrue: [' positional argument'] ifFalse: [' positional arguments'])
			, ' (' , positional size printString , ' given)']

]

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

{ #category : 'Grail-Arity Checks' }
TypeError class >> ___refuseUnboundKeywordsIn___: keywords given: aPositionalCount named: parameterNames positionalOnly: aPositionalOnlyCount for: aFunctionName [
	"A keyword left over after binding either repeats a parameter already given
	by position or names none that may be given by name."

	aPositionalOnlyCount + 1 to: aPositionalCount do: [:index |
		(keywords includesKey: (parameterNames at: index)) ifTrue: [
			^ self @env1:___signal___: 'argument for ' , aFunctionName , '() given by name ('''
				, (parameterNames at: index) , ''') and position (' , index printString , ')']].
	^ self
		___refuseKeywordsIn___: keywords
		otherThan: (parameterNames copyFrom: aPositionalOnlyCount + 1 to: parameterNames size)
		for: aFunctionName

]
