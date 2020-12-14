! ------------------- Remove existing behavior from objectClass
expectvalue /Metaclass3       
doit
objectClass removeAllMethods.
objectClass class removeAllMethods.
%
! ------------------- Class methods for objectClass
! ------------------- Instance methods for objectClass
set compile_env: 0
category: 'other'
method: objectClass
value: arguments value: keywords value: aScope

	^ object new
%
