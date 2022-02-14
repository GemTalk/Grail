! ------------------- Remove existing behavior from builtin_function_or_method
removeAllMethods builtin_function_or_method
removeAllClassMethods builtin_function_or_method
! ------------------- Class methods for builtin_function_or_method
set compile_env: 0
category: 'other'
classmethod: builtin_function_or_method
instance
	
	^self new
%
! ------------------- Instance methods for builtin_function_or_method
set compile_env: 0
category: 'other'
method: builtin_function_or_method
bar

	| y |
	
	y := Notification signal.
	^y * 2
%
category: 'other'
method: builtin_function_or_method
foo

	| bar x |
	x := 1.
	bar := [
		| y |
		x := 2.
		y := x.
	].
	[
		x := bar value.
	] on: Notification do: [ :ex |
		ex resume: 5.
	].
	^bar
%
category: 'other'
method: builtin_function_or_method
print: positionalParameters _: namedParameters

	positionalParameters do: [ :each |
		GsFile stdoutServer nextPutAll: each __str__ ___value; space.
	].
	GsFile stdoutServer nextPutAll: (namedParameters at: #'end' ifAbsent: [ str ___value: Character lf asString ]) ___value.
%
