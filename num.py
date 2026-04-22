from collections import Counter

mode = input("Mode (1: Num Arch, 2: Num user:password): ")
with open("oktelnet.txt", encoding="utf-8") as f:
    lines = [line.strip().split() for line in f if line.strip()]

if mode == "1":
    count = Counter(line[2] for line in lines if len(line) > 2)
else:
    count = Counter(line[1] for line in lines if len(line) > 1 and ":" in line[1])
    creds = []
    for c, n in count.items():
        if n > 10000 and ":" in c:
            u, p = c.split(":", 1)
            creds.append((u, p))
    with open("list.py", "w", encoding="utf-8") as f:
        f.write("CREDENTIALS = [\n")
        for u, p in creds:
            f.write(f'    ("{u}", "{p}"),\n')
        f.write("]\n")

# In kết quả sắp xếp từ nhiều đến ít (ở cuối cùng)
for k, v in count.most_common():
    print(f"{k}: {v}")
