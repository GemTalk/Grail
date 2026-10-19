Extension { #name : 'sys_int_info' }

{ #category : 'Grail-Initialization' }
sys_int_info >> initialize [
	"CPython 64-bit int-implementation parameters."

	self @env0:dynamicInstVarAt: #bits_per_digit put: 30.
	self @env0:dynamicInstVarAt: #sizeof_digit put: 4.
	self @env0:dynamicInstVarAt: #default_max_str_digits put: 4300.
	self @env0:dynamicInstVarAt: #str_digits_check_threshold put: 640

]
