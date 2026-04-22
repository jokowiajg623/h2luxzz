with open("oktelnet.txt") as f, open("ip.txt", "w") as o:
    for line in f:
        o.write(line.split(":")[0] + "\n")
