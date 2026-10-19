Extension { #name : 'PyUnraisableHookArgs' }

{ #category : 'Grail-String Representation' }
PyUnraisableHookArgs >> __repr__ [
	"CPython renders UnraisableHookArgs(exc_type=..., exc_value=..., ...)."

	| b |
	b := (Python @env0:at: #builtins) instance.
	^ 'UnraisableHookArgs(exc_type=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_type')) @env0:asString) @env0:,
		', exc_value=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_value')) @env0:asString) @env0:,
		', exc_traceback=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'exc_traceback')) @env0:asString) @env0:,
		', err_msg=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'err_msg')) @env0:asString) @env0:,
		', object=' @env0:,
		((b repr: (self @env0:dynamicInstVarAt: #'object')) @env0:asString) @env0:,
		')'

]
