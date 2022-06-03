
def my_function(a, b=2, *args, g, c=3, **kargs):
    print(args[0:])
    print(a, b, c, args[0], args[1], args[2], kargs['d'], kargs['e'], kargs['f'], g)

my_function(1,2,4,5,6,d=7,e=8,f=9,g=10)