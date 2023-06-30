FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json .
RUN npm install

# Bundle app source
COPY . .

# Volume for node_modules
VOLUME [ "/usr/src/app/node_modules" ]

# Expose port 5500
EXPOSE 5500

# Start the app
CMD [ "npm", "run", "start:dev" ]