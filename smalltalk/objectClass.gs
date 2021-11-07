! ------------------- Remove existing behavior from objectClass
removeAllMethods objectClass
removeAllClassMethods objectClass
! ------------------- Class methods for objectClass
! ------------------- Instance methods for objectClass
set compile_env: 0
category: 'other'
method: objectClass
value: arguments value: keywords value: aScope

	^ object new
%
