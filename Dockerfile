FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./

RUN yarn

# Bundle app source
COPY . .

EXPOSE 4000

CMD ["yarn", "start"]